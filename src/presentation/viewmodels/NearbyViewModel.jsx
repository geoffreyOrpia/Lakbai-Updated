import { userMessage } from "../../core/errors/appError.jsx";
import { offlineContextContainsPosition } from "../../core/maps/offlineContextMapData.jsx";
import { routingRegionFor, ROUTING_MANIFEST } from "../../data/assets/routingRegionAssets.jsx";
import {
  loadDiscoveryState,
  loadOfflineDiscoveryCatalog,
  recordDiscoveryRecent,
  removeDroppedPin,
  saveDroppedPin,
  searchOfflineDiscovery,
} from "../../domain/usecases/offlineDiscovery.jsx";
import { loadNearbySavedPlaces } from "../../domain/usecases/nearbyPlaces.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

export class NearbyViewModel extends ViewModel {
  constructor(destinationDeps, locationService, nav) {
    super({
      loading: true,
      permission: 'unknown',
      fix: null,
      places: [],
      catalog: { places: [], streets: [] },
      query: '',
      recents: [],
      pins: [],
      basemapUri: null,
      savedPackCount: 0,
      error: null,
    });
    this.destinationDeps = destinationDeps;
    this.locationService = locationService;
    this.nav = nav;
  }

  onInit = () => {
    void this.load();
  };

  get searchResults() {
    return searchOfflineDiscovery(
      {
        ...this.state.catalog,
        places: [...this.state.pins, ...(this.state.catalog?.places ?? [])],
      },
      this.state.query,
      { fix: this.state.fix, limit: 30 },
    );
  }

  setQuery = query => {
    this.setState({ query });
  };

  refreshSavedPlaces = async () => {
    try {
      const saved = await this.destinationDeps.packRepository.listSavedMeta();
      const places = saved.length && this.state.fix
        ? await loadNearbySavedPlaces(this.destinationDeps, this.state.fix)
        : [];
      this.setState({ savedPackCount: saved.length, places });
    } catch (error) {
      this.setState({ error: userMessage(error, 'Your saved places could not refresh. Try again.') });
    }
  };

  load = async () => {
    this.setState({ loading: true, error: null });
    try {
      const [savedMeta, catalog, discoveryState, basemap] = await Promise.all([
        this.destinationDeps.packRepository.listSavedMeta(),
        loadOfflineDiscoveryCatalog(this.destinationDeps),
        loadDiscoveryState(this.destinationDeps),
        this.destinationDeps.packRepository.getOfflineBasemapStatus?.() ?? null,
      ]);

      this.setState({
        catalog,
        recents: discoveryState.recents ?? [],
        pins: discoveryState.pins ?? [],
        basemapUri: basemap?.uri ?? null,
        savedPackCount: savedMeta.length,
      });

      const granted = await this.locationService.requestPermissions();
      if (!granted) {
        this.setState({
          permission: 'denied',
          places: [],
          fix: null,
        });
        return;
      }

      const fix = await this.locationService.getCurrentFix();
      if (!fix) {
        this.setState({
          permission: 'granted',
          places: [],
          fix: null,
          error: 'LakBai could not get a current GPS position. Offline search and dropped pins still work; nearby distance ranking is unavailable.',
        });
        return;
      }

      const places = savedMeta.length
        ? await loadNearbySavedPlaces(this.destinationDeps, fix)
        : [];
      this.setState({
        permission: 'granted',
        fix,
        places,
      });
    } catch (error) {
      this.setState({
        error: userMessage(error, 'Offline discovery could not be prepared from local data.'),
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  recordRecent = async entry => {
    try {
      const recents = await recordDiscoveryRecent(this.destinationDeps, entry);
      if (recents) this.setState({ recents });
    } catch {
      // Discovery actions remain usable even when recent-history persistence fails.
    }
  };

  openEntry = entry => {
    if (entry.destinationId) {
      void this.recordRecent(entry);
      this.nav.onOpenDestination(entry.destinationId);
      return;
    }
    this.navigateToEntry(entry);
  };

  navigateToEntry = entry => {
    if (!Number.isFinite(entry?.lat) || !Number.isFinite(entry?.lng)) return false;
    if (!offlineContextContainsPosition(entry)) {
      this.setState({
        error: 'That point is outside Davao del Norte’s current offline discovery coverage.',
      });
      return false;
    }
    const region = routingRegionFor(entry.destinationId, entry);
    if (!region) {
      this.setState({
        error: 'That point is outside LakBai’s current Davao del Norte offline routing coverage.',
      });
      return false;
    }
    void this.recordRecent(entry);
    const destinationId = entry.destinationId ?? (region === 'samal' ? 'samal' : 'tagum');
    this.nav.onOpenNavigation?.({
      destinationId,
      destinationName: entry.name,
      target: {
        label: entry.name,
        lat: entry.lat,
        lng: entry.lng,
      },
      mode: 'walk',
      preference: 'direct',
      coverage: ROUTING_MANIFEST.regions?.[region]?.name ?? 'Davao del Norte offline roads',
      previewStart: null,
      discoveryTarget: true,
      coordinateStatus: entry.coordinateStatus ?? 'mapped-unverified',
    });
    return true;
  };

  dropPin = async point => {
    try {
      if (!offlineContextContainsPosition(point) || !routingRegionFor(null, point)) {
        const message = 'Drop pins inside Davao del Norte’s current offline routing coverage.';
        this.setState({ error: message });
        return { ok: false, message };
      }
      const { pin, pins } = await saveDroppedPin(this.destinationDeps, point);
      this.setState({ pins, error: null });
      return { ok: true, pin };
    } catch (error) {
      const message = userMessage(error, 'The dropped pin could not be saved.');
      this.setState({ error: message });
      return { ok: false, message };
    }
  };

  removePin = async pinId => {
    try {
      const pins = await removeDroppedPin(this.destinationDeps, pinId);
      this.setState({ pins });
    } catch (error) {
      this.setState({
        error: userMessage(error, 'The saved pin could not be removed.'),
      });
    }
  };

  openDestination = destinationId => {
    this.nav.onOpenDestination(destinationId);
  };

  openLibrary = () => {
    this.nav.onOpenLibrary();
  };

  back = () => {
    this.nav.onBack();
  };
}
