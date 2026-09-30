import { totalDistanceKm } from "../../core/utils/geo.jsx";
import { routingRegionFor } from "../../data/assets/routingRegionAssets.jsx";
import { calculateOfflineFerryJourney } from "./ferryJourney.jsx";
import { calculateOfflineRoute } from "./offlineNavigation.jsx";

const appendCoordinates = (target, source) => {
  for (const coordinate of source ?? []) {
    const previous = target[target.length - 1];
    if (
      previous
      && Math.abs(previous[0] - coordinate[0]) < 1e-9
      && Math.abs(previous[1] - coordinate[1]) < 1e-9
    ) continue;
    target.push(coordinate);
  }
};

const geometryDistanceKm = geometry => totalDistanceKm(
  (geometry?.coordinates ?? []).map(([lng, lat]) => ({ lat, lng })),
);

const offsetManeuvers = (route, offsetKm, firstLeg, progressScale = 1) => (
  (route.maneuvers ?? [])
    .filter(maneuver => firstLeg || maneuver.kind !== 'depart')
    .filter(maneuver => maneuver.kind !== 'arrive')
    .map(maneuver => ({
      ...maneuver,
      distanceAlongKm: offsetKm + maneuver.distanceAlongKm * progressScale,
    }))
);

export const calculateOfflineMultiStopJourney = async ({
  routingGraphRepository,
  from,
  stops,
  mode = 'walk',
  preference = 'direct',
  routeAttractors = [],
  maxSnapDistanceKm = 1,
  initialTurnState = [],
  baseStopIndex = 0,
}) => {
  const validStops = (stops ?? []).filter(stop => (
    Number.isFinite(stop?.target?.lat)
    && Number.isFinite(stop?.target?.lng)
  ));
  if (!validStops.length) return { ok: false, reason: 'multi-stop-empty' };

  const coordinates = [];
  const maneuvers = [];
  const journeyLegs = [];
  const roadLegs = [];
  const ferryLegs = [];
  const stopOffsets = [];
  let currentPoint = from;
  let offsetKm = 0;
  let durationMin = 0;
  let totalDurationKnown = true;

  for (let index = 0; index < validStops.length; index += 1) {
    const stop = validStops[index];
    const originRegion = routingRegionFor(null, currentPoint);
    const targetRegion = routingRegionFor(stop.destinationId, stop.target);
    if (!originRegion || !targetRegion) {
      return { ok: false, reason: 'outside-coverage', stopIndex: baseStopIndex + index };
    }

    let route;
    if (originRegion === targetRegion) {
      const graph = await routingGraphRepository.getForRegion(targetRegion);
      if (!graph) {
        return {
          ok: false,
          reason: 'multi-stop-routing-unavailable',
          stopIndex: baseStopIndex + index,
        };
      }
      route = calculateOfflineRoute({
        graph,
        from: currentPoint,
        to: stop.target,
        mode,
        preference,
        routeAttractors,
        maxSnapDistanceKm,
        targetLabel: stop.name,
        initialTurnState: index === 0 ? initialTurnState : [],
      });
    } else {
      route = await calculateOfflineFerryJourney({
        routingGraphRepository,
        from: currentPoint,
        to: stop.target,
        mode,
        preference,
        routeAttractors,
        maxSnapDistanceKm,
        targetLabel: stop.name,
        initialTurnState: index === 0 ? initialTurnState : [],
      });
    }
    if (!route.ok) {
      return {
        ok: false,
        reason: 'multi-stop-leg-failed',
        routeReason: route.reason,
        stopIndex: baseStopIndex + index,
      };
    }

    const legStartKm = offsetKm;
    const progressDistanceKm = geometryDistanceKm(route.geometry) || route.distanceKm;
    const progressScale = route.distanceKm > 0
      ? progressDistanceKm / route.distanceKm
      : 1;
    const legEndKm = offsetKm + progressDistanceKm;
    appendCoordinates(coordinates, route.geometry.coordinates);
    maneuvers.push(...offsetManeuvers(route, offsetKm, index === 0, progressScale));
    const originalStopIndex = baseStopIndex + index;
    const finalStop = index === validStops.length - 1;
    maneuvers.push({
      id: `multi-stop-${originalStopIndex}`,
      kind: finalStop ? 'arrive' : 'stop-arrive',
      instruction: finalStop
        ? `Arrive at ${stop.name}`
        : `Arrive at stop ${originalStopIndex + 1}: ${stop.name}`,
      streetName: null,
      distanceAlongKm: legEndKm,
      location: { lat: stop.target.lat, lng: stop.target.lng },
      stopIndex: originalStopIndex,
    });

    journeyLegs.push({
      kind: route.type === 'ferry-journey' ? 'ferry-journey' : 'road-journey',
      stopIndex: originalStopIndex,
      startKm: legStartKm,
      endKm: legEndKm,
      route,
      progressScale,
    });
    if (route.type === 'ferry-journey') {
      totalDurationKnown = false;
      for (const roadLeg of route.legs.filter(leg => leg.kind === 'road')) {
        roadLegs.push({
          ...roadLeg,
          stopIndex: originalStopIndex,
          region: roadLeg.region,
          startKm: legStartKm + roadLeg.startKm * progressScale,
          endKm: legStartKm + roadLeg.endKm * progressScale,
          progressScale,
        });
      }
      ferryLegs.push({
        ...route.ferryLeg,
        stopIndex: originalStopIndex,
        startKm: legStartKm + route.ferryLeg.startKm * progressScale,
        endKm: legStartKm + route.ferryLeg.endKm * progressScale,
        progressScale,
      });
    } else {
      roadLegs.push({
        kind: 'road',
        stopIndex: originalStopIndex,
        region: targetRegion,
        startKm: legStartKm,
        endKm: legEndKm,
        route,
        progressScale,
      });
    }
    stopOffsets.push({
      stopIndex: originalStopIndex,
      distanceAlongKm: legEndKm,
      stop,
    });
    offsetKm = legEndKm;
    durationMin += route.durationMin;
    currentPoint = stop.target;
  }

  return {
    ok: true,
    type: 'multi-stop-journey',
    mode,
    preference,
    geometry: { type: 'LineString', coordinates },
    maneuvers,
    distanceKm: offsetKm,
    durationMin,
    totalDurationKnown,
    queueDurationMin: totalDurationKnown ? 0 : null,
    finalTarget: validStops.at(-1).target,
    stops: validStops,
    stopOffsets,
    journeyLegs,
    roadLegs,
    ferryLegs,
  };
};

export const completedMultiStopCount = (route, distanceAlongKm, previousCount = 0) => {
  if (route?.type !== 'multi-stop-journey') return previousCount;
  let completed = previousCount;
  for (const marker of route.stopOffsets ?? []) {
    if (distanceAlongKm >= marker.distanceAlongKm - 0.02) {
      completed = Math.max(completed, marker.stopIndex + 1);
    }
  }
  return completed;
};

export const remainingMultiStopDurationMin = (route, distanceAlongKm = 0) => {
  if (route?.type !== 'multi-stop-journey') return null;
  let remainingMin = 0;
  for (const leg of route.journeyLegs ?? []) {
    const durationMin = leg.route?.durationMin;
    if (!Number.isFinite(durationMin)) continue;
    if (distanceAlongKm <= leg.startKm) {
      remainingMin += durationMin;
      continue;
    }
    if (distanceAlongKm >= leg.endKm) continue;
    const ratio = Math.max(
      0,
      Math.min(1, (leg.endKm - distanceAlongKm) / Math.max(0.001, leg.endKm - leg.startKm)),
    );
    remainingMin += durationMin * ratio;
  }
  return Math.max(0, Math.ceil(remainingMin));
};
