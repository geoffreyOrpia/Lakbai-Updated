import { haversineKm } from "../../core/utils/geo.jsx";
import {
  bearingBetween,
  headingDifferenceDeg,
  nextRouteManeuver,
  placesAlongRoute,
  projectPositionOntoRoute,
  remainingDurationMin,
} from "../../core/routing/routeProgress.jsx";
import { normalizeRoutePreference } from "../../core/routing/routingProfiles.jsx";
import {
  calculateOfflineRoute,
  turnStateBeforeRoutePosition,
} from "../../domain/usecases/offlineNavigation.jsx";
import {
  calculateOfflineFerryJourney,
  isOnFerryLeg,
  remainingFerryJourneyDurationMin,
} from "../../domain/usecases/ferryJourney.jsx";
import {
  calculateOfflineRoadTrailJourney,
  isOnTrailLeg,
  remainingRoadTrailDurationMin,
} from "../../domain/usecases/roadTrailJourney.jsx";
import { calculateOfflineRouteAlternatives } from "../../domain/usecases/routeAlternatives.jsx";
import {
  calculateOfflineMultiStopJourney,
  completedMultiStopCount,
  remainingMultiStopDurationMin,
} from "../../domain/usecases/multiStopJourney.jsx";
import { routingRegionFor } from "../../data/assets/routingRegionAssets.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

const MAX_NAVIGATION_ACCURACY_M = 60;
const MAX_ROUTE_START_ACCURACY_M = 80;
const BASE_OFF_ROUTE_M = 45;
const OFF_ROUTE_CONFIRM_FIXES = 3;
const WRONG_WAY_CONFIRM_FIXES = 3;
const WRONG_WAY_HEADING_DEG = 120;
const REROUTE_COOLDOWN_MS = 12_000;
const MIN_MOVEMENT_M = Object.freeze({
  walk: 4,
  drive: 8,
});
const WRONG_WAY_DISTANCE_M = Object.freeze({
  walk: 12,
  drive: 30,
});

const SCENIC_POI_CATEGORIES = new Set([
  'attraction',
  'beach',
  'island',
  'landmark',
  'museum',
  'park',
  'viewpoint',
]);

const spokenDistance = distanceKm => {
  if (distanceKm == null) return null;
  if (distanceKm >= 1) {
    const rounded = Math.round(distanceKm * 10) / 10;
    return `${rounded} kilometer${rounded === 1 ? '' : 's'}`;
  }
  const meters = distanceKm * 1000;
  const rounded = meters >= 100
    ? Math.max(10, Math.round(meters / 10) * 10)
    : Math.max(5, Math.round(meters / 5) * 5);
  return `${rounded} meters`;
};

const guidanceStage = distanceKm => {
  if (distanceKm == null) return 'preview';
  const meters = distanceKm * 1000;
  if (meters <= 25) return 'now';
  if (meters <= 120) return 'near';
  return 'preview';
};

const spokenGuidance = (maneuver, distanceKm, stage) => {
  if (!maneuver?.instruction) return null;
  if (maneuver.kind === 'arrive' && stage === 'now') return maneuver.instruction;
  if (stage === 'now') return maneuver.instruction;
  const distance = spokenDistance(distanceKm);
  return distance ? `In ${distance}. ${maneuver.instruction}` : maneuver.instruction;
};

export class NavigationViewModel extends ViewModel {
  unwatch = null;
  locationWatchRequest = 0;
  offRouteSamples = 0;
  wrongWaySamples = 0;
  wrongWayDistanceM = 0;
  spokenManeuverId = null;
  spokenStage = null;
  speedSamples = [];
  lastAcceptedFix = null;
  lastFixTimestamp = null;
  lastRerouteAtMs = null;
  gpsLost = false;
  lastConfirmedRouteDistanceKm = 0;

  constructor(routingDeps, destinationDeps, locationService, route, nav) {
    super({
      loading: true,
      calculating: false,
      rerouting: false,
      tracking: false,
      graph: null,
      graphMeta: null,
      destinationId: route.destinationId,
      destinationName: route.destinationName,
      target: route.target,
      multiStops: Array.isArray(route.multiStops) ? route.multiStops : [],
      tripId: route.tripId ?? null,
      tripTitle: route.tripTitle ?? null,
      completedStopCount: Math.max(
        0,
        Math.min(
          Array.isArray(route.multiStops) ? route.multiStops.length : 0,
          Number.isFinite(route.resumeCompletedStopCount) ? route.resumeCompletedStopCount : 0,
        ),
      ),
      resumedSession: route.resumedSession === true,
      trailId: route.trailId ?? null,
      trailPreview: null,
      offlinePois: [],
      scenicPois: [],
      routePois: [],
      mode: route.mode ?? 'walk',
      preference: normalizeRoutePreference(route.preference),
      coverage: route.coverage ?? null,
      discoveryTarget: route.discoveryTarget === true,
      coordinateStatus: route.coordinateStatus ?? null,
      previewStart: route.previewStart ?? null,
      offlineBasemapUri: null,
      fix: null,
      accuracyM: null,
      route: null,
      preview: false,
      permission: 'unknown',
      progressPct: 0,
      distanceAlongKm: 0,
      remainingKm: null,
      remainingMin: null,
      usingLiveEta: false,
      offRouteM: null,
      nextManeuver: null,
      distanceToNextManeuverKm: null,
      voiceGuidance: true,
      rerouteCount: 0,
      alternativeRoutes: [],
      alternativeBaseRoute: null,
      alternativesLoading: false,
      selectedAlternativeId: null,
      journeyPhase: null,
      wrongWay: false,
      arrived: false,
      gpsError: null,
      error: null,
    });
    this.routingDeps = routingDeps;
    this.destinationDeps = destinationDeps;
    this.locationService = locationService;
    this.nav = nav;
  }

  onInit = () => {
    void this.load();
    void this.persistMultiStopSession(this.state.completedStopCount);
  };

  onDispose = () => {
    this.stopLocationWatch();
    this.stopSpeech();
  };

  persistMultiStopSession = async completedStopCount => {
    const repository = this.routingDeps.navigationSessionRepository;
    if (!repository || !this.state.tripId || !this.state.multiStops.length) return;
    try {
      await repository.saveActiveSession({
        version: 1,
        savedAt: Date.now(),
        completedStopCount,
        route: {
          destinationId: this.state.destinationId,
          destinationName: this.state.destinationName,
          target: this.state.target,
          multiStops: this.state.multiStops,
          tripId: this.state.tripId,
          tripTitle: this.state.tripTitle,
          mode: this.state.mode,
          preference: this.state.preference,
          coverage: this.state.coverage,
        },
      });
    } catch {
      // Navigation continues even if the resume checkpoint cannot be persisted.
    }
  };

  clearPersistedMultiStopSession = async () => {
    if (!this.state.tripId) return;
    try {
      await this.routingDeps.navigationSessionRepository?.clearActiveSession();
    } catch {
      // Route cleanup should not block the live navigation flow.
    }
  };

  load = async () => {
    try {
      const [bundle, bundledBasemap, savedPack, bundledPack] = await Promise.all([
        this.destinationDeps.packRepository.getOfflineBundleStatus?.(this.state.destinationId) ?? null,
        this.destinationDeps.packRepository.getOfflineBasemapStatus?.() ?? null,
        this.destinationDeps.packRepository.getSavedPack?.(this.state.destinationId) ?? null,
        this.destinationDeps.packRepository.getBundledPack?.(this.state.destinationId) ?? null,
      ]);
      const graph = await this.routingDeps.routingGraphRepository.getForDestination(
        this.state.destinationId,
        bundle?.routingGraphUri ?? null,
        this.state.target,
        bundle?.sharedRouting ?? null,
      );
      const navigationPack = savedPack ?? bundledPack;
      const trailPreview = this.state.trailId
        ? navigationPack?.trails?.find(trail => (
          trail.id === this.state.trailId && trail.routeVerified === true
        )) ?? null
        : null;
      const offlinePois = (navigationPack?.spots ?? []).filter(spot => (
        haversineKm(spot, this.state.target) > 0.08
      ));
      const scenicPois = offlinePois.filter(spot => (
        SCENIC_POI_CATEGORIES.has(String(spot.category ?? '').toLowerCase())
      ));
      this.setState({
        graph,
        graphMeta: graph?.meta ?? null,
        coverage: graph?.meta?.name ?? this.state.coverage,
        trailPreview,
        offlinePois,
        scenicPois,
        offlineBasemapUri: bundle?.basemapUri ?? bundledBasemap?.uri ?? null,
        error: !graph
          ? 'Offline road routing is not available for this destination yet.'
          : !(bundle?.basemapUri ?? bundledBasemap?.uri)
          ? 'The saved map could not open. Please try again.'
          : null,
      });
    } catch {
      this.setState({
        error: 'Directions could not load for this place. Please try again.',
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  get lowAccuracy() {
    return (this.state.accuracyM ?? 0) > MAX_NAVIGATION_ACCURACY_M;
  }

  get offRouteThresholdM() {
    return Math.max(BASE_OFF_ROUTE_M, (this.state.accuracyM ?? 0) * 1.8);
  }

  get offRoute() {
    return !this.lowAccuracy
      && this.state.offRouteM != null
      && this.state.offRouteM > this.offRouteThresholdM;
  }

  startFromGps = async () => {
    if (!this.state.graph || !this.state.offlineBasemapUri) return;
    this.stopLocationWatch();
    this.setState({
      calculating: true,
      tracking: false,
      error: null,
      gpsError: null,
      preview: false,
      arrived: false,
    });

    try {
      const granted = await this.locationService.requestPermissions();
      if (!granted) {
        this.setState({
          permission: 'denied',
          error: 'Location permission is required to calculate a route from your current position.',
        });
        return;
      }
      this.setState({ permission: 'granted' });
      const fix = await this.locationService.getCurrentFix();
      if (!fix) {
        this.setState({
          error: 'Your location could not be found. Move to an open area and try again.',
        });
        return;
      }
      if (fix.accuracy != null && fix.accuracy > MAX_ROUTE_START_ACCURACY_M) {
        this.setState({
          fix,
          accuracyM: fix.accuracy,
          error: `GPS accuracy is about ${Math.round(fix.accuracy)} m. Move to an open area and try again before calculating a navigation route.`,
        });
        return;
      }
      await this.calculateFrom(fix, false);
    } finally {
      this.setState({ calculating: false });
    }
  };

  previewRoute = async () => {
    if (!this.state.graph || !this.state.offlineBasemapUri || !this.state.previewStart) return;
    this.stopLocationWatch();
    this.setState({ calculating: true, tracking: false, error: null, gpsError: null });
    try {
      await this.calculateFrom(this.state.previewStart, true);
    } finally {
      this.setState({ calculating: false });
    }
  };

  calculateRouteResult = async (from, initialTurnState = []) => {
    const originRegion = routingRegionFor(null, from);
    const targetRegion = routingRegionFor(this.state.destinationId, this.state.target);
    if (this.state.multiStops.length > this.state.completedStopCount) {
      return calculateOfflineMultiStopJourney({
        routingGraphRepository: this.routingDeps.routingGraphRepository,
        from,
        stops: this.state.multiStops.slice(this.state.completedStopCount),
        baseStopIndex: this.state.completedStopCount,
        mode: this.state.mode,
        preference: this.state.preference,
        routeAttractors: this.state.scenicPois,
        maxSnapDistanceKm: 1,
        initialTurnState,
      });
    }
    if (
      this.state.trailPreview?.routeVerified
      && this.state.mode === 'walk'
      && originRegion
      && targetRegion
      && originRegion === targetRegion
    ) {
      return calculateOfflineRoadTrailJourney({
        graph: this.state.graph,
        from,
        trail: this.state.trailPreview,
        mode: 'walk',
        preference: this.state.preference,
        routeAttractors: this.state.scenicPois,
        maxSnapDistanceKm: 1,
        initialTurnState,
      });
    }
    if (
      originRegion
      && targetRegion
      && originRegion !== targetRegion
      && this.routingDeps.routingGraphRepository?.getForRegion
    ) {
      return calculateOfflineFerryJourney({
        routingGraphRepository: this.routingDeps.routingGraphRepository,
        from,
        to: this.state.target,
        mode: this.state.mode,
        preference: this.state.preference,
        routeAttractors: this.state.scenicPois,
        maxSnapDistanceKm: 1,
        targetLabel: this.state.target.label ?? this.state.destinationName,
        initialTurnState,
      });
    }
    return calculateOfflineRoute({
      graph: this.state.graph,
      from,
      to: this.state.target,
      mode: this.state.mode,
      preference: this.state.preference,
      routeAttractors: this.state.scenicPois,
      maxSnapDistanceKm: 1,
      targetLabel: this.state.target.label ?? this.state.destinationName,
      initialTurnState,
    });
  };

  calculateFrom = async (from, preview) => {
    const result = await this.calculateRouteResult(from);

    if (!result.ok) {
      this.setState({
        fix: from,
        accuracyM: from.accuracy ?? null,
        route: null,
        preview,
        progressPct: 0,
        remainingKm: null,
        remainingMin: null,
        nextManeuver: null,
        distanceToNextManeuverKm: null,
        journeyPhase: null,
        error: result.reason === 'ferry-unavailable' || result.reason === 'ferry-required'
          ? 'No suitable ferry route to or from Samal was found from your location.'
          : result.reason === 'multi-stop-leg-failed' || result.reason === 'multi-stop-routing-unavailable'
          ? `No route was found to stop ${(result.stopIndex ?? 0) + 1}.`
          : result.reason === 'trail-approach-route-failed'
          ? 'No walking route to the trail entrance was found from your location.'
          : result.reason === 'trail-unverified'
          ? 'Directions are not available for this trail because its path has not been checked.'
          : result.reason === 'ferry-origin-route-failed'
          ? 'No route to the ferry terminal was found from your location.'
          : result.reason === 'ferry-destination-route-failed'
          ? 'No route was found from the ferry terminal to your destination.'
          : result.reason === 'outside-coverage'
          ? `Your position is outside the current ${this.state.coverage ?? 'offline-routing coverage'}.`
          : 'No connected offline route could be found from this position.',
      });
      return null;
    }

    this.resetNavigationEvidence();
    this.setState({
      fix: from,
      accuracyM: from.accuracy ?? null,
      route: result,
      alternativeRoutes: [],
      alternativeBaseRoute: null,
      selectedAlternativeId: null,
      coverage: result.type === 'ferry-journey'
        ? 'Davao del Norte ↔ Samal via source-reviewed ferry link'
        : this.state.coverage,
      preview,
      progressPct: 0,
      distanceAlongKm: 0,
      remainingKm: result.distanceKm,
      remainingMin: result.type === 'ferry-journey'
        ? remainingFerryJourneyDurationMin(result, 0)
        : result.type === 'road-trail-journey'
        ? remainingRoadTrailDurationMin(result, 0)
        : result.type === 'multi-stop-journey'
        ? remainingMultiStopDurationMin(result, 0)
        : result.durationMin,
      offRouteM: null,
      nextManeuver: result.maneuvers?.[1] ?? result.maneuvers?.[0] ?? null,
      distanceToNextManeuverKm: result.maneuvers?.[1]?.distanceAlongKm ?? null,
      routePois: placesAlongRoute(result, this.state.offlinePois),
      journeyPhase: (
        result.type === 'ferry-journey'
        || result.type === 'road-trail-journey'
        || result.type === 'multi-stop-journey'
      ) ? 'road' : null,
      wrongWay: false,
      arrived: false,
      error: null,
    });
    if (!preview) this.applyFix(from);
    return result;
  };

  findAlternatives = async () => {
    const route = this.state.route;
    const from = this.state.fix;
    if (!route?.ok || !from || this.state.tracking || this.state.alternativesLoading) return;
    if (route.type === 'ferry-journey' || route.type === 'multi-stop-journey') {
      this.setState({
        alternativeRoutes: [],
        error: route.type === 'multi-stop-journey'
          ? 'Alternative previews are generated for single-destination journeys, not an ordered itinerary.'
          : 'Alternative road previews are not offered across the fixed ferry transport leg.',
      });
      return;
    }

    this.setState({ alternativesLoading: true, error: null });
    try {
      const primaryRoadRoute = route.type === 'road-trail-journey'
        ? route.legs?.find(leg => leg.kind === 'road')?.route
        : route;
      const target = route.type === 'road-trail-journey'
        ? route.trailLeg?.start
        : this.state.target;
      if (!primaryRoadRoute?.ok || !target) {
        this.setState({ alternativeRoutes: [] });
        return;
      }
      const result = calculateOfflineRouteAlternatives({
        graph: this.state.graph,
        from,
        to: target,
        mode: this.state.mode,
        preference: this.state.preference,
        routeAttractors: this.state.scenicPois,
        maxSnapDistanceKm: 1,
        targetLabel: target.name ?? target.label ?? this.state.destinationName,
        primaryRoute: primaryRoadRoute,
        limit: 2,
      });
      const alternatives = route.type === 'road-trail-journey'
        ? result.alternatives.map(candidate => ({
          ...calculateOfflineRoadTrailJourney({
            graph: this.state.graph,
            from,
            trail: this.state.trailPreview,
            mode: 'walk',
            preference: this.state.preference,
            routeAttractors: this.state.scenicPois,
            maxSnapDistanceKm: 1,
            roadRoute: candidate,
          }),
          alternativeId: candidate.alternativeId,
          distanceDeltaKm: candidate.distanceDeltaKm,
          durationDeltaMin: candidate.durationDeltaMin,
        })).filter(candidate => candidate.ok)
        : result.alternatives;
      this.setState({
        alternativeRoutes: alternatives,
        alternativeBaseRoute: route,
        selectedAlternativeId: null,
      });
    } finally {
      this.setState({ alternativesLoading: false });
    }
  };

  selectAlternative = alternativeId => {
    if (this.state.tracking) return;
    const route = alternativeId === 'primary'
      ? this.state.alternativeBaseRoute
      : this.state.alternativeRoutes.find(candidate => (
        candidate.alternativeId === alternativeId
      ));
    if (!route?.ok) return;
    this.resetSpokenGuidance();
    this.resetNavigationEvidence();
    this.setState({
      route,
      selectedAlternativeId: alternativeId === 'primary' ? null : alternativeId,
      progressPct: 0,
      distanceAlongKm: 0,
      remainingKm: route.distanceKm,
      remainingMin: route.type === 'road-trail-journey'
        ? remainingRoadTrailDurationMin(route, 0)
        : route.durationMin,
      usingLiveEta: false,
      offRouteM: null,
      nextManeuver: route.maneuvers?.[1] ?? route.maneuvers?.[0] ?? null,
      distanceToNextManeuverKm: route.maneuvers?.[1]?.distanceAlongKm ?? null,
      routePois: placesAlongRoute(route, this.state.offlinePois),
      journeyPhase: route.type === 'road-trail-journey' ? 'road' : null,
      wrongWay: false,
      arrived: false,
      error: null,
    });
  };

  startNavigation = async () => {
    if (!this.state.route || this.state.preview || this.state.tracking) return;
    const request = ++this.locationWatchRequest;
    const granted = this.state.permission === 'granted'
      ? true
      : await this.locationService.requestPermissions();
    if (request !== this.locationWatchRequest) return;
    if (!granted) {
      this.setState({
        permission: 'denied',
        gpsError: 'Location permission is required for live LakBai navigation.',
      });
      return;
    }

    this.setState({
      permission: 'granted',
      tracking: true,
      gpsError: null,
      arrived: false,
    });
    this.announceGuidance(
      this.state.nextManeuver,
      this.state.distanceToNextManeuverKm,
      true,
    );

    try {
      const currentFix = await this.locationService.getCurrentFix();
      if (request !== this.locationWatchRequest) return;
      if (currentFix) this.applyFix(currentFix);
      if (request !== this.locationWatchRequest) return;
      const unwatch = await this.locationService.watchFix(
        fix => { if (request === this.locationWatchRequest) this.applyFix(fix); },
        error => { if (request === this.locationWatchRequest) this.handleLocationError(error); },
      );
      if (request !== this.locationWatchRequest) unwatch?.();
      else this.unwatch = unwatch;
    } catch {
      if (request !== this.locationWatchRequest) return;
      this.stopLocationWatch();
      this.setState({
        tracking: false,
        gpsError: 'LakBai could not start live GPS navigation.',
      });
    }
  };

  stopNavigation = () => {
    this.stopLocationWatch();
    this.stopSpeech();
    this.resetNavigationEvidence();
    this.setState({
      tracking: false,
      rerouting: false,
      usingLiveEta: false,
      wrongWay: false,
      gpsError: null,
    });
  };

  stopLocationWatch = () => {
    this.locationWatchRequest += 1;
    this.unwatch?.();
    this.unwatch = null;
  };

  setPreference = preference => {
    if (this.state.tracking || this.state.calculating) return;
    this.setState({
      preference: normalizeRoutePreference(preference),
      alternativeRoutes: [],
      selectedAlternativeId: null,
    });
    void this.persistMultiStopSession(this.state.completedStopCount);
  };

  setMode = mode => {
    if (this.state.tracking || this.state.calculating) return;
    if (mode !== 'walk' && mode !== 'drive') return;
    this.setState({
      mode,
      preference: mode === 'walk' ? this.state.preference : 'direct',
      alternativeRoutes: [],
      selectedAlternativeId: null,
    });
    void this.persistMultiStopSession(this.state.completedStopCount);
  };

  stopSpeech = () => {
    void this.routingDeps.speechService?.stop?.();
  };

  resetSpokenGuidance = () => {
    this.spokenManeuverId = null;
    this.spokenStage = null;
  };

  resetNavigationEvidence = ({ preserveRerouteCooldown = false } = {}) => {
    this.speedSamples = [];
    this.offRouteSamples = 0;
    this.wrongWaySamples = 0;
    this.wrongWayDistanceM = 0;
    this.lastAcceptedFix = null;
    this.lastFixTimestamp = null;
    this.lastConfirmedRouteDistanceKm = 0;
    this.gpsLost = false;
    if (!preserveRerouteCooldown) this.lastRerouteAtMs = null;
  };

  handleLocationError = message => {
    this.gpsLost = true;
    this.offRouteSamples = 0;
    this.wrongWaySamples = 0;
    this.wrongWayDistanceM = 0;
    this.speedSamples = [];
    this.setState({
      wrongWay: false,
      gpsError: message || 'Live GPS updates are unavailable right now. Route progress is paused until GPS recovers.',
    });
  };

  announceGuidance = (maneuver, distanceKm, force = false) => {
    if (
      !this.state.voiceGuidance
      || !this.state.tracking
      || !maneuver
      || !this.routingDeps.speechService?.speak
    ) return;

    const stage = guidanceStage(distanceKm);
    if (
      !force
      && this.spokenManeuverId === maneuver.id
      && this.spokenStage === stage
    ) return;

    const text = spokenGuidance(maneuver, distanceKm, stage);
    if (!text) return;
    this.spokenManeuverId = maneuver.id;
    this.spokenStage = stage;
    void this.routingDeps.speechService.speak(text);
  };

  toggleVoiceGuidance = () => {
    const voiceGuidance = !this.state.voiceGuidance;
    this.setState({ voiceGuidance });
    this.resetSpokenGuidance();
    if (!voiceGuidance) {
      this.stopSpeech();
      return;
    }
    if (this.state.tracking) {
      this.announceGuidance(
        this.state.nextManeuver,
        this.state.distanceToNextManeuverKm,
        true,
      );
    }
  };

  recordSpeedEstimate = speedMps => {
    const minSpeed = this.state.mode === 'drive' ? 2 : 0.55;
    const maxSpeed = this.state.mode === 'drive' ? 45 : 2.5;
    if (!Number.isFinite(speedMps) || speedMps < minSpeed || speedMps > maxSpeed) {
      this.speedSamples = [];
      return null;
    }

    this.speedSamples.push(speedMps);
    if (this.speedSamples.length > 5) this.speedSamples.shift();
    return this.speedSamples.reduce((sum, speed) => sum + speed, 0) / this.speedSamples.length;
  };

  applyFix = fix => {
    const route = this.state.route;
    const accuracyM = fix.accuracy ?? null;
    const fixTimestamp = Number.isFinite(fix.timestamp) ? fix.timestamp : null;
    if (
      fixTimestamp != null
      && this.lastFixTimestamp != null
      && fixTimestamp <= this.lastFixTimestamp
    ) {
      return;
    }
    if (fixTimestamp != null) this.lastFixTimestamp = fixTimestamp;

    if (!route || this.state.preview) {
      this.setState({ fix, accuracyM });
      return;
    }

    if (accuracyM != null && accuracyM > MAX_NAVIGATION_ACCURACY_M) {
      this.gpsLost = true;
      this.offRouteSamples = 0;
      this.wrongWaySamples = 0;
      this.wrongWayDistanceM = 0;
      this.speedSamples = [];
      this.setState({
        fix,
        accuracyM,
        wrongWay: false,
        gpsError: `GPS accuracy is about ${Math.round(accuracyM)} m. Route progress and rerouting are paused until accuracy improves.`,
      });
      return;
    }

    const recoveredFromGpsLoss = this.gpsLost;
    const previousFix = this.lastAcceptedFix;
    const movementDistanceM = previousFix
      ? haversineKm(previousFix, fix) * 1000
      : null;
    const minimumMovementM = MIN_MOVEMENT_M[this.state.mode] ?? MIN_MOVEMENT_M.walk;
    const previousAccuracyM = previousFix?.accuracy ?? 0;
    const jitterThresholdM = Math.max(
      2.5,
      Math.min(8, Math.max(accuracyM ?? 0, previousAccuracyM) * 0.35),
    );
    const lowMotionSpeed = !Number.isFinite(fix.speed)
      || fix.speed < (this.state.mode === 'drive' ? 1 : 0.3);
    const stationaryJitter = this.state.tracking
      && movementDistanceM != null
      && movementDistanceM < jitterThresholdM
      && lowMotionSpeed;

    if (stationaryJitter) {
      this.gpsLost = false;
      this.setState({
        fix,
        accuracyM,
        gpsError: null,
      });
      return;
    }

    const movementHeading = (
      previousFix
      && movementDistanceM >= minimumMovementM
    ) ? bearingBetween(previousFix, fix) : null;
    const reportedHeading = (
      Number.isFinite(fix.heading)
      && fix.heading >= 0
      && Number.isFinite(fix.speed)
      && fix.speed >= (this.state.mode === 'drive' ? 1 : 0.5)
    ) ? fix.heading : null;
    const matchingHeading = movementHeading ?? reportedHeading;
    const maxAdvanceKm = (
      this.state.tracking
      && movementDistanceM != null
    ) ? this.state.distanceAlongKm + (
      movementDistanceM + Math.max(20, (accuracyM ?? 0) * 1.5)
    ) / 1000 : null;
    const projection = projectPositionOntoRoute(
      route,
      fix,
      this.state.tracking
        ? {
          previousDistanceAlongKm: this.state.distanceAlongKm,
          maxBacktrackKm: 0.008,
          maxAdvanceKm,
          headingDeg: matchingHeading,
        }
        : undefined,
    );
    const boundedDistanceAlongKm = (
      this.state.tracking && Number.isFinite(maxAdvanceKm)
    ) ? Math.min(maxAdvanceKm, projection.distanceAlongKm) : projection.distanceAlongKm;
    const stableDistanceAlongKm = this.state.tracking
      ? Math.max(this.state.distanceAlongKm, boundedDistanceAlongKm)
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
    const arrivalTarget = route.finalTarget ?? this.state.target;
    const targetDistanceM = haversineKm(fix, arrivalTarget) * 1000;
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
      this.wrongWaySamples += 1;
      this.wrongWayDistanceM += movementDistanceM;
    } else if (movementHeading != null) {
      this.wrongWaySamples = 0;
      this.wrongWayDistanceM = 0;
    }
    if (recoveredFromGpsLoss) {
      this.offRouteSamples = 0;
      this.wrongWaySamples = 0;
      this.wrongWayDistanceM = 0;
      this.speedSamples = [];
    }
    const wrongWay = (
      this.wrongWaySamples >= WRONG_WAY_CONFIRM_FIXES
      && this.wrongWayDistanceM >= (WRONG_WAY_DISTANCE_M[this.state.mode] ?? WRONG_WAY_DISTANCE_M.walk)
    );
    const arrived = !wrongWay
      && stableProjection.remainingKm <= 0.08
      && targetDistanceM <= arrivalThresholdM;
    const liveSpeedMps = this.state.tracking && !onFerryLeg && !onTrailLeg
      ? this.recordSpeedEstimate(fix.speed)
      : null;
    const completedStopCount = route.type === 'multi-stop-journey'
      ? completedMultiStopCount(
        route,
        stableProjection.distanceAlongKm,
        this.state.completedStopCount,
      )
      : this.state.completedStopCount;
    const completedStopChanged = completedStopCount !== this.state.completedStopCount;

    if (offRoute && this.state.tracking && !arrived) {
      this.offRouteSamples += 1;
    } else {
      this.offRouteSamples = 0;
    }
    if (this.state.tracking && !offRoute && !wrongWay) {
      this.lastConfirmedRouteDistanceKm = stableProjection.distanceAlongKm;
    }

    this.lastAcceptedFix = fix;
    this.gpsLost = false;
    this.setState({
      fix,
      accuracyM,
      progressPct: Math.round(stableProjection.progress * 100),
      distanceAlongKm: stableProjection.distanceAlongKm,
      remainingKm: stableProjection.remainingKm,
      remainingMin: route.type === 'ferry-journey'
        ? remainingFerryJourneyDurationMin(route, stableProjection.distanceAlongKm)
        : route.type === 'road-trail-journey'
        ? remainingRoadTrailDurationMin(route, stableProjection.distanceAlongKm, liveSpeedMps)
        : route.type === 'multi-stop-journey'
        ? remainingMultiStopDurationMin(route, stableProjection.distanceAlongKm)
        : remainingDurationMin(route, stableProjection.remainingKm, liveSpeedMps),
      usingLiveEta: (
        route.type !== 'ferry-journey'
        && route.type !== 'multi-stop-journey'
        && !onTrailLeg
        && liveSpeedMps != null
      ),
      offRouteM: stableProjection.distanceToRouteM,
      nextManeuver: next.maneuver,
      distanceToNextManeuverKm: next.distanceKm,
      routePois: placesAlongRoute(route, this.state.offlinePois, stableProjection.distanceAlongKm),
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
    });

    if (completedStopChanged) {
      void this.persistMultiStopSession(completedStopCount);
    }

    if (this.state.tracking && !offRoute && !wrongWay) {
      this.announceGuidance(next.maneuver, next.distanceKm);
    }

    if (arrived) {
      this.stopLocationWatch();
      this.setState({ tracking: false, rerouting: false });
      void this.clearPersistedMultiStopSession();
      return;
    }

    const rerouteConfirmed = (
      (!onTrailLeg && offRoute && this.offRouteSamples >= OFF_ROUTE_CONFIRM_FIXES)
      || wrongWay
    );
    const eventTimeMs = fixTimestamp ?? Date.now();
    const cooldownElapsed = this.lastRerouteAtMs == null
      || eventTimeMs - this.lastRerouteAtMs >= REROUTE_COOLDOWN_MS;
    if (
      rerouteConfirmed
      && cooldownElapsed
      && this.state.tracking
      && !this.state.rerouting
    ) {
      this.lastRerouteAtMs = eventTimeMs;
      this.offRouteSamples = 0;
      this.wrongWaySamples = 0;
      this.wrongWayDistanceM = 0;
      void this.rerouteFrom(fix);
    }
  };

  rerouteFrom = async fix => {
    if (!this.state.graph || !this.state.route) return;
    let initialTurnState = [];
    if (this.state.route.type === 'ferry-journey') {
      const region = routingRegionFor(null, fix);
      const roadLeg = this.state.route.legs?.find(leg => (
        leg.kind === 'road'
        && leg.region === region
        && this.lastConfirmedRouteDistanceKm >= leg.startKm - 0.05
        && this.lastConfirmedRouteDistanceKm <= leg.endKm + 0.05
      ));
      if (roadLeg && region) {
        const targetRegion = routingRegionFor(this.state.destinationId, this.state.target);
        const graph = region === targetRegion
          ? this.state.graph
          : await this.routingDeps.routingGraphRepository.getForRegion(region);
        if (graph) {
          initialTurnState = turnStateBeforeRoutePosition({
            graph,
            route: roadLeg.route,
            distanceAlongKm: Math.max(0, this.lastConfirmedRouteDistanceKm - roadLeg.startKm),
            mode: this.state.mode,
          });
        }
      }
    } else if (this.state.route.type === 'multi-stop-journey') {
      const region = routingRegionFor(null, fix);
      const roadLeg = this.state.route.roadLegs?.find(leg => (
        leg.region === region
        && this.lastConfirmedRouteDistanceKm >= leg.startKm - 0.05
        && this.lastConfirmedRouteDistanceKm <= leg.endKm + 0.05
      ));
      if (roadLeg && region) {
        const graph = await this.routingDeps.routingGraphRepository.getForRegion(region);
        if (graph) {
          initialTurnState = turnStateBeforeRoutePosition({
            graph,
            route: roadLeg.route,
            distanceAlongKm: Math.max(
              0,
              (this.lastConfirmedRouteDistanceKm - roadLeg.startKm)
                / Math.max(0.001, roadLeg.progressScale ?? 1),
            ),
            mode: this.state.mode,
          });
        }
      }
    } else if (this.state.route.type === 'road-trail-journey') {
      const roadLeg = this.state.route.legs?.find(leg => leg.kind === 'road');
      if (roadLeg) {
        initialTurnState = turnStateBeforeRoutePosition({
          graph: this.state.graph,
          route: roadLeg.route,
          distanceAlongKm: Math.min(
            roadLeg.endKm,
            this.lastConfirmedRouteDistanceKm,
          ),
          mode: this.state.mode,
        });
      }
    } else {
      initialTurnState = turnStateBeforeRoutePosition({
        graph: this.state.graph,
        route: this.state.route,
        distanceAlongKm: this.lastConfirmedRouteDistanceKm,
        mode: this.state.mode,
      });
    }
    this.setState({ rerouting: true, gpsError: null });
    try {
      const result = await this.calculateRouteResult(fix, initialTurnState);
      if (!result.ok) {
        this.setState({
          gpsError: 'You may be off your route. No new route was found. Check the map when safe.',
        });
        return;
      }

      this.resetSpokenGuidance();
      this.resetNavigationEvidence({ preserveRerouteCooldown: true });
      this.setState(previous => ({
        route: result,
        alternativeRoutes: [],
        alternativeBaseRoute: null,
        selectedAlternativeId: null,
        journeyPhase: (
          result.type === 'ferry-journey'
          || result.type === 'road-trail-journey'
          || result.type === 'multi-stop-journey'
        ) ? 'road' : null,
        rerouteCount: previous.rerouteCount + 1,
        progressPct: 0,
        distanceAlongKm: 0,
        remainingKm: result.distanceKm,
        remainingMin: result.type === 'ferry-journey'
          ? remainingFerryJourneyDurationMin(result, 0)
          : result.type === 'road-trail-journey'
          ? remainingRoadTrailDurationMin(result, 0)
          : result.type === 'multi-stop-journey'
          ? remainingMultiStopDurationMin(result, 0)
          : result.durationMin,
        nextManeuver: result.maneuvers?.[1] ?? result.maneuvers?.[0] ?? null,
        distanceToNextManeuverKm: result.maneuvers?.[1]?.distanceAlongKm ?? null,
        offRouteM: 0,
        wrongWay: false,
      }));
      this.applyFix(fix);
    } finally {
      this.setState({ rerouting: false });
    }
  };

  clearRoute = () => {
    this.stopLocationWatch();
    this.stopSpeech();
    this.resetSpokenGuidance();
    this.resetNavigationEvidence();
    this.setState({
      fix: null,
      accuracyM: null,
      route: null,
      alternativeRoutes: [],
      alternativeBaseRoute: null,
      alternativesLoading: false,
      selectedAlternativeId: null,
      preview: false,
      tracking: false,
      progressPct: 0,
      distanceAlongKm: 0,
      remainingKm: null,
      remainingMin: null,
      usingLiveEta: false,
      offRouteM: null,
      nextManeuver: null,
      distanceToNextManeuverKm: null,
      routePois: [],
      rerouteCount: 0,
      completedStopCount: 0,
      journeyPhase: null,
      wrongWay: false,
      arrived: false,
      gpsError: null,
      error: null,
    });
  };

  openTrail = () => {
    if (!this.state.trailId || !this.nav.onOpenTrail) return;
    this.stopLocationWatch();
    this.stopSpeech();
    this.nav.onOpenTrail(this.state.trailId);
  };

  back = () => {
    this.stopLocationWatch();
    this.stopSpeech();
    this.nav.onBack();
  };
}
