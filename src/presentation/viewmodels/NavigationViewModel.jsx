import { calculateOfflineRoute } from "../../domain/usecases/offlineNavigation.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

const PANABO_PREVIEW_START = Object.freeze({
  lat: 7.2999,
  lng: 125.6807,
});

export class NavigationViewModel extends ViewModel {
  constructor(routingDeps, destinationDeps, locationService, route, nav) {
    super({
      loading: true,
      calculating: false,
      graph: null,
      graphMeta: null,
      destinationId: route.destinationId,
      destinationName: route.destinationName,
      target: route.target,
      mode: route.mode ?? 'walk',
      offlineBasemapUri: null,
      fix: null,
      route: null,
      preview: false,
      permission: 'unknown',
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

  startFromGps = async () => {
    if (!this.state.graph || !this.state.offlineBasemapUri) return;
    this.setState({ calculating: true, error: null, preview: false });
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
      this.calculateFrom(fix, false);
    } finally {
      this.setState({ calculating: false });
    }
  };

  previewPilot = () => {
    if (!this.state.graph || !this.state.offlineBasemapUri) return;
    this.setState({ calculating: true, error: null });
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
    });

    if (!result.ok) {
      this.setState({
        fix: from,
        route: null,
        preview,
        error: result.reason === 'outside-coverage'
          ? 'Your position is outside the current Panabo offline-routing pilot. The pilot currently covers central/coastal Panabo around the mangrove park.'
          : 'No connected offline route could be found from this position.',
      });
      return;
    }

    this.setState({
      fix: from,
      route: result,
      preview,
      error: null,
    });
  };

  clearRoute = () => {
    this.setState({
      fix: null,
      route: null,
      preview: false,
      error: null,
    });
  };

  back = () => {
    this.nav.onBack();
  };
}
