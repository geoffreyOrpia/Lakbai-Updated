import { nextTrailWaypoint, projectOntoTrail, totalDistanceKm, trailCoordinates } from "../../core/utils/geo.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

const OFF_TRAIL_BASE_M = 40;
const MAX_RELIABLE_ACCURACY_M = 50;

/** GPS trail navigation over a pack saved to the local Library; works fully offline. */
export class TrailViewModel extends ViewModel {
  unwatch = null;

  constructor(deps, location, destinationId, trailId, nav) {
    super({
      trail: null,
      destinationId,
      destinationName: '',
      hasPack: false,
      loading: true,
      error: null,
      tracking: false,
      permission: 'unknown',
      fix: null,
      routeDistanceKm: 0,
      traveledKm: 0,
      remainingKm: 0,
      progressPct: 0,
      offTrailM: null,
      accuracyM: null,
      nextWaypoint: null,
      distanceToNextWaypointKm: null,
      estimatedRemainingMin: null,
      completed: false,
      offlineBasemapUri: null,
      gpsError: null
    });
    this.deps = deps;
    this.location = location;
    this.destinationId = destinationId;
    this.trailId = trailId;
    this.nav = nav;
  }

  onInit = () => {
    void this.load();
  };

  onDispose = () => {
    this.stopTracking();
  };

  load = async () => {
    const pack = await this.deps.packRepository.getSavedPack(this.destinationId);
    if (!pack) {
      this.setState({
        loading: false,
        hasPack: false,
        error: 'Save this destination guide for offline use before opening the trail.'
      });
      return;
    }

    const [offlineBundle, trail] = await Promise.all([
      this.deps.packRepository.getOfflineBundleStatus?.(this.destinationId) ?? null,
      Promise.resolve(pack.trails.find(candidate => candidate.id === this.trailId) ?? null),
    ]);
    const routeDistanceKm = trail ? totalDistanceKm(trailCoordinates(trail)) : 0;

    this.setState({
      loading: false,
      hasPack: true,
      trail,
      destinationName: pack.destination.name,
      routeDistanceKm,
      remainingKm: routeDistanceKm,
      offlineBasemapUri: offlineBundle?.basemapUri ?? null,
      error: trail ? null : 'This trail is not available in the saved guide.'
    });

    if (trail) {
      const fix = await this.location.getCurrentFix({ purpose: 'trail' });
      if (fix && !this.state.tracking) {
        this.applyFix(fix);
      }
    }
  };

  startTracking = async () => {
    if (!this.state.trail || this.state.tracking) return;
    const granted = await this.location.requestPermissions();
    if (!granted) {
      this.setState({
        permission: 'denied'
      });
      return;
    }

    this.setState({
      permission: 'granted',
      tracking: true,
      gpsError: null
    });

    const initialFix = await this.location.getCurrentFix({ purpose: 'trail' });
    if (initialFix) {
      this.applyFix(initialFix);
    } else {
      this.setState({
        gpsError: 'Waiting for a navigation-quality GPS fix. Move to an open area if this persists.'
      });
    }

    try {
      this.unwatch = await this.location.watchFix(
        fix => this.applyFix(fix),
        message => this.setState({
          gpsError: message || 'Location updates are unavailable right now.'
        }),
        { purpose: 'trail' },
      );
    } catch {
      this.setState({
        tracking: false,
        gpsError: 'Location tracking could not be started.'
      });
    }
  };

  stopTracking = () => {
    this.unwatch?.();
    this.unwatch = null;
    this.setState({
      tracking: false
    });
  };

  back = () => {
    this.nav.onBack();
  };

  get lowAccuracy() {
    return (this.state.accuracyM ?? Number.POSITIVE_INFINITY) > MAX_RELIABLE_ACCURACY_M;
  }

  get offTrailThresholdM() {
    return Math.max(OFF_TRAIL_BASE_M, (this.state.accuracyM ?? 0) * 1.5);
  }

  get offTrail() {
    return !this.lowAccuracy && (this.state.offTrailM ?? 0) > this.offTrailThresholdM;
  }

  applyFix = fix => {
    const trail = this.state.trail;
    const accuracyM = fix.accuracy ?? null;

    if (!trail) {
      this.setState({
        fix,
        accuracyM
      });
      return;
    }

    if (accuracyM == null || accuracyM > MAX_RELIABLE_ACCURACY_M) {
      this.setState({
        fix,
        accuracyM,
        gpsError: null
      });
      return;
    }

    const projection = projectOntoTrail(trail, fix);
    const routeDistanceKm = projection.totalDistanceKm || this.state.routeDistanceKm;
    const traveledKm = projection.distanceAlongKm;
    const remainingKm = Math.max(0, routeDistanceKm - traveledKm);
    const nextWaypoint = nextTrailWaypoint(trail, projection.progress);
    const distanceToNextWaypointKm = nextWaypoint
      ? Math.max(0, (nextWaypoint.trailProgress - projection.progress) * routeDistanceKm)
      : null;
    const estimatedRemainingMin = Math.max(
      0,
      Math.ceil((trail.durationMin ?? 0) * (1 - projection.progress)),
    );
    const offTrailThresholdM = Math.max(OFF_TRAIL_BASE_M, accuracyM * 1.5);

    this.setState({
      fix,
      routeDistanceKm,
      traveledKm,
      remainingKm,
      progressPct: Math.round(projection.progress * 100),
      offTrailM: projection.distanceToTrailM,
      accuracyM,
      nextWaypoint,
      distanceToNextWaypointKm,
      estimatedRemainingMin,
      completed: projection.progress >= 0.98 && projection.distanceToTrailM <= offTrailThresholdM,
      gpsError: null
    });
  };
}
