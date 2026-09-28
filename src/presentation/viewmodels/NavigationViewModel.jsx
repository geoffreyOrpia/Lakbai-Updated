import { haversineKm } from "../../core/utils/geo.jsx";
import {
  nextRouteManeuver,
  placesAlongRoute,
  projectPositionOntoRoute,
  remainingDurationMin,
} from "../../core/routing/routeProgress.jsx";
import { normalizeRoutePreference } from "../../core/routing/routingProfiles.jsx";
import { calculateOfflineRoute } from "../../domain/usecases/offlineNavigation.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

const MAX_NAVIGATION_ACCURACY_M = 60;
const MAX_ROUTE_START_ACCURACY_M = 80;
const BASE_OFF_ROUTE_M = 45;
const OFF_ROUTE_CONFIRM_FIXES = 3;

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
  offRouteSamples = 0;
  spokenManeuverId = null;
  spokenStage = null;
  speedSamples = [];

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
      trailId: route.trailId ?? null,
      trailPreview: null,
      offlinePois: [],
      scenicPois: [],
      routePois: [],
      mode: route.mode ?? 'walk',
      preference: normalizeRoutePreference(route.preference),
      coverage: route.coverage ?? null,
      previewStart: route.previewStart ?? null,
      offlineBasemapUri: null,
      fix: null,
      accuracyM: null,
      route: null,
      preview: false,
      permission: 'unknown',
      progressPct: 0,
      remainingKm: null,
      remainingMin: null,
      usingLiveEta: false,
      offRouteM: null,
      nextManeuver: null,
      distanceToNextManeuverKm: null,
      voiceGuidance: true,
      rerouteCount: 0,
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
  };

  onDispose = () => {
    this.stopLocationWatch();
    this.stopSpeech();
  };

  load = async () => {
    try {
      const [bundle, savedPack] = await Promise.all([
        this.destinationDeps.packRepository.getOfflineBundleStatus?.(this.state.destinationId) ?? null,
        this.destinationDeps.packRepository.getSavedPack?.(this.state.destinationId) ?? null,
      ]);
      const graph = await this.routingDeps.routingGraphRepository.getForDestination(
        this.state.destinationId,
        bundle?.routingGraphUri ?? null,
      );
      const trailPreview = this.state.trailId
        ? savedPack?.trails?.find(trail => (
          trail.id === this.state.trailId && trail.routeVerified === true
        )) ?? null
        : null;
      const offlinePois = (savedPack?.spots ?? []).filter(spot => (
        haversineKm(spot, this.state.target) > 0.08
      ));
      const scenicPois = offlinePois.filter(spot => (
        SCENIC_POI_CATEGORIES.has(String(spot.category ?? '').toLowerCase())
      ));
      this.setState({
        graph,
        graphMeta: graph?.meta ?? null,
        trailPreview,
        offlinePois,
        scenicPois,
        offlineBasemapUri: bundle?.basemapUri ?? null,
        error: !graph
          ? 'Offline road routing is not available for this destination yet.'
          : !bundle?.basemapUri
          ? 'Save or update this destination pack before using offline navigation.'
          : null,
      });
    } catch {
      this.setState({
        error: 'LakBai could not load the offline routing data for this destination.',
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
          error: 'LakBai could not get a current GPS fix. Move to an open area and try again.',
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
      this.calculateFrom(fix, false);
    } finally {
      this.setState({ calculating: false });
    }
  };

  previewRoute = () => {
    if (!this.state.graph || !this.state.offlineBasemapUri || !this.state.previewStart) return;
    this.stopLocationWatch();
    this.setState({ calculating: true, tracking: false, error: null, gpsError: null });
    this.calculateFrom(this.state.previewStart, true);
    this.setState({ calculating: false });
  };

  calculateFrom = (from, preview) => {
    const result = calculateOfflineRoute({
      graph: this.state.graph,
      from,
      to: this.state.target,
      mode: this.state.mode,
      preference: this.state.preference,
      routeAttractors: this.state.scenicPois,
      maxSnapDistanceKm: 1,
      targetLabel: this.state.target.label ?? this.state.destinationName,
    });

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
        error: result.reason === 'outside-coverage'
          ? `Your position is outside the current ${this.state.coverage ?? 'offline-routing coverage'}.`
          : 'No connected offline route could be found from this position.',
      });
      return null;
    }

    this.setState({
      fix: from,
      accuracyM: from.accuracy ?? null,
      route: result,
      preview,
      progressPct: 0,
      remainingKm: result.distanceKm,
      remainingMin: result.durationMin,
      offRouteM: null,
      nextManeuver: result.maneuvers?.[1] ?? result.maneuvers?.[0] ?? null,
      distanceToNextManeuverKm: result.maneuvers?.[1]?.distanceAlongKm ?? null,
      routePois: placesAlongRoute(result, this.state.offlinePois),
      arrived: false,
      error: null,
    });
    if (!preview) this.applyFix(from);
    return result;
  };

  startNavigation = async () => {
    if (!this.state.route || this.state.preview || this.state.tracking) return;
    const granted = this.state.permission === 'granted'
      ? true
      : await this.locationService.requestPermissions();
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

    try {
      const currentFix = await this.locationService.getCurrentFix();
      if (currentFix) this.applyFix(currentFix);
      this.unwatch = await this.locationService.watchFix(
        fix => this.applyFix(fix),
        message => this.setState({
          gpsError: message || 'Live GPS updates are unavailable right now.',
        }),
      );
    } catch {
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
    this.speedSamples = [];
    this.offRouteSamples = 0;
    this.setState({
      tracking: false,
      rerouting: false,
      usingLiveEta: false,
      gpsError: null,
    });
  };

  stopLocationWatch = () => {
    this.unwatch?.();
    this.unwatch = null;
  };

  setPreference = preference => {
    if (this.state.tracking || this.state.calculating) return;
    this.setState({ preference: normalizeRoutePreference(preference) });
  };

  setMode = mode => {
    if (this.state.tracking || this.state.calculating) return;
    if (mode !== 'walk' && mode !== 'drive') return;
    this.setState({
      mode,
      preference: mode === 'walk' ? this.state.preference : 'direct',
    });
  };

  stopSpeech = () => {
    void this.routingDeps.speechService?.stop?.();
  };

  resetSpokenGuidance = () => {
    this.spokenManeuverId = null;
    this.spokenStage = null;
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
    if (!route || this.state.preview) {
      this.setState({ fix, accuracyM });
      return;
    }

    if (accuracyM != null && accuracyM > MAX_NAVIGATION_ACCURACY_M) {
      this.offRouteSamples = 0;
      this.setState({
        fix,
        accuracyM,
        gpsError: `GPS accuracy is about ${Math.round(accuracyM)} m. Route progress and rerouting are paused until accuracy improves.`,
      });
      return;
    }

    const projection = projectPositionOntoRoute(route, fix);
    const next = nextRouteManeuver(route, projection.distanceAlongKm);
    const thresholdM = Math.max(BASE_OFF_ROUTE_M, (accuracyM ?? 0) * 1.8);
    const offRoute = projection.distanceToRouteM > thresholdM;
    const targetDistanceM = haversineKm(fix, this.state.target) * 1000;
    const arrivalThresholdM = Math.max(35, (accuracyM ?? 0) * 1.5);
    const arrived = projection.remainingKm <= 0.08 && targetDistanceM <= arrivalThresholdM;
    const liveSpeedMps = this.state.tracking ? this.recordSpeedEstimate(fix.speed) : null;

    if (offRoute && this.state.tracking && !arrived) {
      this.offRouteSamples += 1;
    } else {
      this.offRouteSamples = 0;
    }

    this.setState({
      fix,
      accuracyM,
      progressPct: Math.round(projection.progress * 100),
      remainingKm: projection.remainingKm,
      remainingMin: remainingDurationMin(route, projection.remainingKm, liveSpeedMps),
      usingLiveEta: liveSpeedMps != null,
      offRouteM: projection.distanceToRouteM,
      nextManeuver: next.maneuver,
      distanceToNextManeuverKm: next.distanceKm,
      routePois: placesAlongRoute(route, this.state.offlinePois, projection.distanceAlongKm),
      arrived,
      gpsError: null,
    });

    if (this.state.tracking) {
      this.announceGuidance(next.maneuver, next.distanceKm);
    }

    if (arrived) {
      this.stopLocationWatch();
      this.setState({ tracking: false, rerouting: false });
      return;
    }

    if (
      offRoute
      && this.offRouteSamples >= OFF_ROUTE_CONFIRM_FIXES
      && this.state.tracking
      && !this.state.rerouting
    ) {
      this.offRouteSamples = 0;
      void this.rerouteFrom(fix);
    }
  };

  rerouteFrom = async fix => {
    if (!this.state.graph || !this.state.route) return;
    this.setState({ rerouting: true, gpsError: null });
    try {
      const result = calculateOfflineRoute({
        graph: this.state.graph,
        from: fix,
        to: this.state.target,
        mode: this.state.mode,
        preference: this.state.preference,
        routeAttractors: this.state.scenicPois,
        maxSnapDistanceKm: 1,
        targetLabel: this.state.target.label ?? this.state.destinationName,
      });
      if (!result.ok) {
        this.setState({
          gpsError: 'You appear to be off the active route, but LakBai could not find another connected offline route from this position.',
        });
        return;
      }

      this.resetSpokenGuidance();
      this.setState(previous => ({
        route: result,
        rerouteCount: previous.rerouteCount + 1,
        progressPct: 0,
        remainingKm: result.distanceKm,
        remainingMin: result.durationMin,
        nextManeuver: result.maneuvers?.[1] ?? result.maneuvers?.[0] ?? null,
        distanceToNextManeuverKm: result.maneuvers?.[1]?.distanceAlongKm ?? null,
        offRouteM: 0,
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
    this.speedSamples = [];
    this.offRouteSamples = 0;
    this.setState({
      fix: null,
      accuracyM: null,
      route: null,
      preview: false,
      tracking: false,
      progressPct: 0,
      remainingKm: null,
      remainingMin: null,
      usingLiveEta: false,
      offRouteM: null,
      nextManeuver: null,
      distanceToNextManeuverKm: null,
      routePois: [],
      rerouteCount: 0,
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
