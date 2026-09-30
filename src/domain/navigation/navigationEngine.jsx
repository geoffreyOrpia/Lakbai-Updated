import { haversineKm } from "../../core/utils/geo.jsx";
import {
  bearingBetween,
  headingDifferenceDeg,
  nextRouteManeuver,
  projectPositionOntoRoute,
  remainingDurationMin,
} from "../../core/routing/routeProgress.jsx";
import {
  isOnFerryLeg,
  remainingFerryJourneyDurationMin,
} from "../usecases/ferryJourney.jsx";
import {
  isOnTrailLeg,
  remainingRoadTrailDurationMin,
} from "../usecases/roadTrailJourney.jsx";
import {
  completedMultiStopCount,
  remainingMultiStopDurationMin,
} from "../usecases/multiStopJourney.jsx";

export const MAX_NAVIGATION_ACCURACY_M = 60;
export const BASE_OFF_ROUTE_M = 45;
export const OFF_ROUTE_CONFIRM_FIXES = 3;
export const WRONG_WAY_CONFIRM_FIXES = 3;
export const WRONG_WAY_HEADING_DEG = 120;

const MIN_MOVEMENT_M = Object.freeze({
  walk: 4,
  drive: 8,
});

const WRONG_WAY_DISTANCE_M = Object.freeze({
  walk: 12,
  drive: 30,
});

export const createNavigationEvidence = (seed = {}) => ({
  offRouteSamples: Number.isFinite(seed.offRouteSamples) ? Math.max(0, seed.offRouteSamples) : 0,
  wrongWaySamples: Number.isFinite(seed.wrongWaySamples) ? Math.max(0, seed.wrongWaySamples) : 0,
  wrongWayDistanceM: Number.isFinite(seed.wrongWayDistanceM) ? Math.max(0, seed.wrongWayDistanceM) : 0,
  speedSamples: Array.isArray(seed.speedSamples)
    ? seed.speedSamples.filter(Number.isFinite).slice(-5)
    : [],
  lastAcceptedFix: seed.lastAcceptedFix ?? null,
  lastFixTimestamp: Number.isFinite(seed.lastFixTimestamp) ? seed.lastFixTimestamp : null,
  gpsLost: seed.gpsLost === true,
  lastConfirmedRouteDistanceKm: Number.isFinite(seed.lastConfirmedRouteDistanceKm)
    ? Math.max(0, seed.lastConfirmedRouteDistanceKm)
    : 0,
});

const recordSpeedEstimate = (evidence, speedMps, mode) => {
  const minSpeed = mode === 'drive' ? 2 : 0.55;
  const maxSpeed = mode === 'drive' ? 45 : 2.5;
  if (!Number.isFinite(speedMps) || speedMps < minSpeed || speedMps > maxSpeed) {
    evidence.speedSamples = [];
    return null;
  }

  evidence.speedSamples = [...evidence.speedSamples, speedMps].slice(-5);
  return evidence.speedSamples.reduce((sum, speed) => sum + speed, 0)
    / evidence.speedSamples.length;
};

export const advanceNavigationProgress = ({
  route,
  target,
  mode = 'walk',
  tracking = true,
  distanceAlongKm = 0,
  completedStopCount: previousCompletedStopCount = 0,
  evidence: evidenceInput,
  fix,
}) => {
  const evidence = createNavigationEvidence(evidenceInput);
  const accuracyM = fix?.accuracy ?? null;
  const fixTimestamp = Number.isFinite(fix?.timestamp) ? fix.timestamp : null;

  if (
    fixTimestamp != null
    && evidence.lastFixTimestamp != null
    && fixTimestamp <= evidence.lastFixTimestamp
  ) {
    return {
      ignored: true,
      evidence,
      patch: {},
      offRoute: false,
      wrongWay: false,
      arrived: false,
      rerouteRecommended: false,
    };
  }
  if (fixTimestamp != null) evidence.lastFixTimestamp = fixTimestamp;

  if (!route || !fix) {
    return {
      ignored: false,
      evidence,
      patch: { fix: fix ?? null, accuracyM },
      offRoute: false,
      wrongWay: false,
      arrived: false,
      rerouteRecommended: false,
    };
  }

  if (accuracyM != null && accuracyM > MAX_NAVIGATION_ACCURACY_M) {
    evidence.gpsLost = true;
    evidence.offRouteSamples = 0;
    evidence.wrongWaySamples = 0;
    evidence.wrongWayDistanceM = 0;
    evidence.speedSamples = [];
    return {
      ignored: false,
      evidence,
      patch: {
        fix,
        accuracyM,
        wrongWay: false,
        gpsError: `GPS accuracy is about ${Math.round(accuracyM)} m. Route progress and rerouting are paused until accuracy improves.`,
      },
      offRoute: false,
      wrongWay: false,
      arrived: false,
      rerouteRecommended: false,
      lowAccuracy: true,
    };
  }

  const recoveredFromGpsLoss = evidence.gpsLost;
  const previousFix = evidence.lastAcceptedFix;
  const movementDistanceM = previousFix
    ? haversineKm(previousFix, fix) * 1000
    : null;
  const minimumMovementM = MIN_MOVEMENT_M[mode] ?? MIN_MOVEMENT_M.walk;
  const previousAccuracyM = previousFix?.accuracy ?? 0;
  const jitterThresholdM = Math.max(
    2.5,
    Math.min(8, Math.max(accuracyM ?? 0, previousAccuracyM) * 0.35),
  );
  const lowMotionSpeed = !Number.isFinite(fix.speed)
    || fix.speed < (mode === 'drive' ? 1 : 0.3);
  const stationaryJitter = tracking
    && movementDistanceM != null
    && movementDistanceM < jitterThresholdM
    && lowMotionSpeed;

  if (stationaryJitter) {
    evidence.gpsLost = false;
    return {
      ignored: false,
      evidence,
      patch: {
        fix,
        accuracyM,
        gpsError: null,
      },
      offRoute: false,
      wrongWay: false,
      arrived: false,
      rerouteRecommended: false,
      stationaryJitter: true,
    };
  }

  const movementHeading = (
    previousFix
    && movementDistanceM >= minimumMovementM
  ) ? bearingBetween(previousFix, fix) : null;
  const reportedHeading = (
    Number.isFinite(fix.heading)
    && fix.heading >= 0
    && Number.isFinite(fix.speed)
    && fix.speed >= (mode === 'drive' ? 1 : 0.5)
  ) ? fix.heading : null;
  const matchingHeading = movementHeading ?? reportedHeading;
  const maxAdvanceKm = (
    tracking
    && movementDistanceM != null
  ) ? distanceAlongKm + (
    movementDistanceM + Math.max(20, (accuracyM ?? 0) * 1.5)
  ) / 1000 : null;

  const projection = projectPositionOntoRoute(
    route,
    fix,
    tracking
      ? {
        previousDistanceAlongKm: distanceAlongKm,
        maxBacktrackKm: 0.008,
        maxAdvanceKm,
        headingDeg: matchingHeading,
      }
      : undefined,
  );
  const boundedDistanceAlongKm = (
    tracking && Number.isFinite(maxAdvanceKm)
  ) ? Math.min(maxAdvanceKm, projection.distanceAlongKm) : projection.distanceAlongKm;
  const stableDistanceAlongKm = tracking
    ? Math.max(distanceAlongKm, boundedDistanceAlongKm)
    : boundedDistanceAlongKm;
  const stableProjection = stableDistanceAlongKm === projection.distanceAlongKm
    ? projection
    : {
      ...projection,
      distanceAlongKm: stableDistanceAlongKm,
      remainingKm: Math.max(0, route.distanceKm - stableDistanceAlongKm),
      progress: route.distanceKm > 0
        ? Math.min(1, stableDistanceAlongKm / route.distanceKm)
        : 0,
    };

  const next = nextRouteManeuver(route, stableProjection.distanceAlongKm);
  const onFerryLeg = isOnFerryLeg(route, stableProjection.distanceAlongKm);
  const onTrailLeg = isOnTrailLeg(route, stableProjection.distanceAlongKm);
  const thresholdM = Math.max(BASE_OFF_ROUTE_M, (accuracyM ?? 0) * 1.8);
  const offRoute = !onFerryLeg && stableProjection.distanceToRouteM > thresholdM;
  const arrivalTarget = route.finalTarget ?? target;
  const targetDistanceM = arrivalTarget ? haversineKm(fix, arrivalTarget) * 1000 : Infinity;
  const arrivalThresholdM = Math.max(35, (accuracyM ?? 0) * 1.5);
  const routeHeadingDifference = headingDifferenceDeg(
    movementHeading,
    stableProjection.segmentBearingDeg,
  );
  const wrongWaySample = (
    !recoveredFromGpsLoss
    && !onFerryLeg
    && !onTrailLeg
    && !offRoute
    && movementDistanceM >= minimumMovementM
    && routeHeadingDifference != null
    && routeHeadingDifference >= WRONG_WAY_HEADING_DEG
  );

  if (wrongWaySample) {
    evidence.wrongWaySamples += 1;
    evidence.wrongWayDistanceM += movementDistanceM;
  } else if (movementHeading != null) {
    evidence.wrongWaySamples = 0;
    evidence.wrongWayDistanceM = 0;
  }

  if (recoveredFromGpsLoss) {
    evidence.offRouteSamples = 0;
    evidence.wrongWaySamples = 0;
    evidence.wrongWayDistanceM = 0;
    evidence.speedSamples = [];
  }

  const wrongWay = (
    evidence.wrongWaySamples >= WRONG_WAY_CONFIRM_FIXES
    && evidence.wrongWayDistanceM >= (WRONG_WAY_DISTANCE_M[mode] ?? WRONG_WAY_DISTANCE_M.walk)
  );
  const arrived = !wrongWay
    && stableProjection.remainingKm <= 0.08
    && targetDistanceM <= arrivalThresholdM;
  const liveSpeedMps = tracking && !onFerryLeg && !onTrailLeg
    ? recordSpeedEstimate(evidence, fix.speed, mode)
    : null;
  const completedStopCount = route.type === 'multi-stop-journey'
    ? completedMultiStopCount(
      route,
      stableProjection.distanceAlongKm,
      previousCompletedStopCount,
    )
    : previousCompletedStopCount;

  if (offRoute && tracking && !arrived) {
    evidence.offRouteSamples += 1;
  } else {
    evidence.offRouteSamples = 0;
  }

  if (tracking && !offRoute && !wrongWay) {
    evidence.lastConfirmedRouteDistanceKm = stableProjection.distanceAlongKm;
  }

  evidence.lastAcceptedFix = fix;
  evidence.gpsLost = false;

  const remainingMin = route.type === 'ferry-journey'
    ? remainingFerryJourneyDurationMin(route, stableProjection.distanceAlongKm)
    : route.type === 'road-trail-journey'
    ? remainingRoadTrailDurationMin(route, stableProjection.distanceAlongKm, liveSpeedMps)
    : route.type === 'multi-stop-journey'
    ? remainingMultiStopDurationMin(route, stableProjection.distanceAlongKm)
    : remainingDurationMin(route, stableProjection.remainingKm, liveSpeedMps);

  const patch = {
    fix,
    accuracyM,
    progressPct: Math.round(stableProjection.progress * 100),
    distanceAlongKm: stableProjection.distanceAlongKm,
    remainingKm: stableProjection.remainingKm,
    remainingMin,
    usingLiveEta: (
      route.type !== 'ferry-journey'
      && route.type !== 'multi-stop-journey'
      && !onTrailLeg
      && liveSpeedMps != null
    ),
    offRouteM: stableProjection.distanceToRouteM,
    nextManeuver: next.maneuver,
    distanceToNextManeuverKm: next.distanceKm,
    completedStopCount,
    journeyPhase: route.type === 'ferry-journey'
      ? (onFerryLeg ? 'ferry' : 'road')
      : route.type === 'road-trail-journey'
      ? (onTrailLeg ? 'trail' : 'road')
      : route.type === 'multi-stop-journey'
      ? (onFerryLeg ? 'ferry' : 'road')
      : null,
    wrongWay,
    arrived,
    gpsError: null,
  };

  return {
    ignored: false,
    evidence,
    patch,
    offRoute,
    wrongWay,
    arrived,
    onFerryLeg,
    onTrailLeg,
    completedStopChanged: completedStopCount !== previousCompletedStopCount,
    rerouteRecommended: (
      (!onTrailLeg && offRoute && evidence.offRouteSamples >= OFF_ROUTE_CONFIRM_FIXES)
      || wrongWay
    ),
    guidance: tracking && !offRoute && !wrongWay
      ? { maneuver: next.maneuver, distanceKm: next.distanceKm }
      : null,
  };
};
