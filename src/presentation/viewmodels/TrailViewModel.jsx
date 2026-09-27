import { projectOntoTrail } from "../../core/utils/geo.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";
const OFF_TRAIL_WARNING_M = 120;
const MAX_RELIABLE_ACCURACY_M = 50;

/** GPS trail navigation over a downloaded pack; works fully offline. */
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
      traveledKm: 0,
      remainingKm: 0,
      progressPct: 0,
      offTrailM: null,
      accuracyM: null,
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
    const pack = await this.deps.packRepository.getDownloadedPack(this.destinationId);
    if (!pack) {
      this.setState({
        loading: false,
        hasPack: false,
        error: 'This trail needs its destination pack in your local library. Open the destination and save the pack first.'
      });
      return;
    }
    const trail = pack.trails.find(candidate => candidate.id === this.trailId) ?? null;
    this.setState({
      loading: false,
      hasPack: true,
      trail,
      destinationName: pack.destination.name,
      error: trail ? null : 'This trail is not part of the saved pack.'
    });
    if (trail) {
      const fix = await this.location.getCurrentFix();
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
    const initialFix = await this.location.getCurrentFix();
    if (initialFix) {
      this.applyFix(initialFix);
    } else {
      this.setState({
        gpsError: 'Waiting for a reliable GPS fix. Move to an open area if this persists.'
      });
    }
    try {
      this.unwatch = await this.location.watchFix(fix => this.applyFix(fix), message => this.setState({
        gpsError: message || 'Location updates are unavailable right now.'
      }));
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
  get offTrail() {
    return !this.lowAccuracy && (this.state.offTrailM ?? 0) > OFF_TRAIL_WARNING_M;
  }
  applyFix = fix => {
    const trail = this.state.trail;
    if (!trail) {
      this.setState({
        fix
      });
      return;
    }
    const projection = projectOntoTrail(trail, fix);
    const traveledKm = projection.progress * trail.distanceKm;
    this.setState({
      fix,
      traveledKm,
      remainingKm: Math.max(0, trail.distanceKm - traveledKm),
      progressPct: Math.round(projection.progress * 100),
      offTrailM: projection.distanceToTrailM,
      accuracyM: fix.accuracy ?? null,
      gpsError: null
    });
  };
}
