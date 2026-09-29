import { userMessage } from "../../core/errors/appError.jsx";
import { offlineContextContainsPosition } from "../../core/maps/offlineContextMapData.jsx";
import { routingRegionFor, ROUTING_MANIFEST } from "../../data/assets/routingRegionAssets.jsx";
import {
  listOfflineTourismPlaces,
  loadDiscoveryState,
  loadOfflineDiscoveryCatalog,
  recordDiscoveryRecent,
  removeDroppedPin,
  saveDroppedPin,
  searchOfflineDiscovery,
} from "../../domain/usecases/offlineDiscovery.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

const SEARCH_PAGE_SIZE = 10;
const TOURISM_PAGE_SIZE = 10;

export class NearbyViewModel extends ViewModel {
  constructor(destinationDeps, locationService, nav) {
    super({
      loading: true,
      permission: 'unknown',
      fix: null,
      catalog: { places: [], streets: [] },
      query: '',
      searchLimit: SEARCH_PAGE_SIZE,
      tourismLimit: TOURISM_PAGE_SIZE,
      recents: [],
      pins: [],
      basemapUri: null,
      savedPackIds: [],
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

  get searchPage() {
    return searchOfflineDiscovery(
      {
        ...this.state.catalog,
        places: [...this.state.pins, ...(this.state.catalog?.places ?? [])],
      },
      this.state.query,
      { fix: this.state.fix, limit: this.state.searchLimit + 1 },
    );
  }

  get searchResults() {
    return this.searchPage.slice(0, this.state.searchLimit);
  }

  get hasMoreSearchResults() {
    return this.searchPage.length > this.state.searchLimit;
  }

  get tourismPage() {
    return listOfflineTourismPlaces(this.state.catalog, {
      fix: this.state.fix,
      limit: this.state.tourismLimit + 1,
    });
  }

  get tourismPlaces() {
    const saved = new Set(this.state.savedPackIds);
    return this.tourismPage.slice(0, this.state.tourismLimit).map(entry => ({
      ...entry,
      saved: entry.destinationId ? saved.has(entry.destinationId) : false,
    }));
  }

  get hasMoreTourismPlaces() {
    return this.tourismPage.length > this.state.tourismLimit;
  }

  get tourismPlaceCount() {
    return this.state.catalog?.places?.length ?? 0;
  }

  setQuery = query => {
    this.setState({ query, searchLimit: SEARCH_PAGE_SIZE });
  };

  loadMoreSearchResults = () => {
    this.setState(previous => ({ searchLimit: previous.searchLimit + SEARCH_PAGE_SIZE }));
  };

  loadMoreTourismPlaces = () => {
    this.setState(previous => ({ tourismLimit: previous.tourismLimit + TOURISM_PAGE_SIZE }));
  };

  refreshSavedPlaces = async () => {
    try {
      const saved = await this.destinationDeps.packRepository.listSavedMeta();
      this.setState({
        savedPackIds: saved.map(entry => entry.packId),
        savedPackCount: saved.length,
      });
    } catch (error) {
      this.setState({ error: userMessage(error, 'Your saved places could not refresh. Try again.') });
    }
  };

  load = async () => {
    this.setState({
      loading: true,
      error: null,
      searchLimit: SEARCH_PAGE_SIZE,
      tourismLimit: TOURISM_PAGE_SIZE,
    });
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
        savedPackIds: savedMeta.map(entry => entry.packId),
        savedPackCount: savedMeta.length,
      });

      const granted = await this.locationService.requestPermissions();
      if (!granted) {
        this.setState({
          permission: 'denied',
          fix: null,
        });
        return;
      }

      const fix = await this.locationService.getCurrentFix();
      if (!fix) {
        this.setState({
          permission: 'granted',
          fix: null,
          error: 'LakBai could not get a location estimate yet. All tourism places and offline search still work; distance ordering is unavailable.',
        });
        return;
      }

      this.setState({
        permission: 'granted',
        fix,
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
