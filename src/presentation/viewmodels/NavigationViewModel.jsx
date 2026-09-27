import { haversineKm } from "../../core/utils/geo.jsx";
import {
  nextRouteManeuver,
  projectPositionOntoRoute,
  remainingDurationMin,
} from "../../core/routing/routeProgress.jsx";
import { calculateOfflineRoute } from "../../domain/usecases/offlineNavigation.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

const PANABO_PREVIEW_START = Object.freeze({
  lat: 7.2999,
  lng: 125.6807,
});

const MAX_NAVIGATION_ACCURACY_M = 60;
const MAX_ROUTE_START_ACCURACY_M = 80;
const BASE_OFF_ROUTE_M = 45;
const OFF_ROUTE_CONFIRM_FIXES = 3;

export class NavigationViewModel extends ViewModel {
  unwatch = null;
  offRouteSamples = 0;

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
      mode: route.mode ?? 'walk',
      offlineBasemapUri: null,
      fix: null,
      accuracyM: null,
      route: null,
      preview: false,
      permission: 'unknown',
      progressPct: 0,
      remainingKm: null,
      remainingMin: null,
      offRouteM: null,
      nextManeuver: null,
      distanceToNextManeuverKm: null,
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
  };

  load = async () => {
    try {
      const [graph, bundle] = await Promise.all([
        this.routingDeps.routingGraphRepository.getForDestination(this.state.destinationId),
        this.destinationDeps.packRepository.getOfflineBundleStatus?.(this.state.destinationId) ?? null,
      ]);
      this.setState({
        graph,
        graphMeta: graph?.meta ?? null,
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

  previewPilot = () => {
    if (!this.state.graph || !this.state.offlineBasemapUri) return;
    this.stopLocationWatch();
    this.setState({ calculating: true, tracking: false, error: null, gpsError: null });
    this.calculateFrom(PANABO_PREVIEW_START, true);
    this.setState({ calculating: false });
  };

  calculateFrom = (from, preview) => {
    const result = calculateOfflineRoute({
      graph: this.state.graph,
      from,
      to: this.state.target,
      mode: this.state.mode,
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
          ? 'Your position is outside the current Panabo offline-routing pilot. The pilot currently covers central/coastal Panabo around the mangrove park.'
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
    this.offRouteSamples = 0;
    this.setState({
      tracking: false,
      rerouting: false,
      gpsError: null,
    });
  };

  stopLocationWatch = () => {
    this.unwatch?.();
    this.unwatch = null;
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
      remainingMin: remainingDurationMin(route, projection.remainingKm),
      offRouteM: projection.distanceToRouteM,
      nextManeuver: next.maneuver,
      distanceToNextManeuverKm: next.distanceKm,
      arrived,
      gpsError: null,
    });

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
        maxSnapDistanceKm: 1,
        targetLabel: this.state.target.label ?? this.state.destinationName,
      });
      if (!result.ok) {
        this.setState({
          gpsError: 'You appear to be off the active route, but LakBai could not find another connected offline route from this position.',
        });
        return;
      }

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
      offRouteM: null,
      nextManeuver: null,
      distanceToNextManeuverKm: null,
      rerouteCount: 0,
      arrived: false,
      gpsError: null,
      error: null,
    });
  };

  openTrail = () => {
    if (!this.state.trailId || !this.nav.onOpenTrail) return;
    this.stopLocationWatch();
    this.nav.onOpenTrail(this.state.trailId);
  };

  back = () => {
    this.stopLocationWatch();
    this.nav.onBack();
  };
}
