import { listDestinationsWithState, removePackFromLibrary, savePackToLibrary } from "../../domain/usecases/destinationPacks.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { searchTourismWeb } from "../../domain/usecases/onlineResearch.jsx";
import { toggleDestinationFavorite } from "../../domain/usecases/favorites.jsx";
import {
  buildSmartTripDraft,
  estimateRecommendationRoutes,
  recommendTourismPlaces,
} from "../../domain/usecases/smartExplore.jsx";
import { loadSmartExploreCatalog } from "../../domain/usecases/smartExploreKnowledge.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

const defaultSmartPreferences = () => ({
  interests: [],
  walking: 'any',
  travelMode: 'drive',
  ferry: 'allow',
  savedOnly: false,
});

/** Explore catalog plus fully offline, explainable tourism recommendations. */
export class ExploreViewModel extends ViewModel {
  constructor(deps, onlineResearchDeps, routingDeps = {}, locationService = null, nav = {}) {
    super({
      items: [],
      query: '',
      category: 'all',
      loading: true,
      onlineSearching: false,
      busyId: null,
      source: null,
      error: null,
      smartOpen: false,
      smartCatalog: [],
      smartPreferences: defaultSmartPreferences(),
      smartFix: null,
      smartLocationStatus: 'idle',
      smartRouting: false,
      smartRouteEstimates: {},
      smartSelectedIds: [],
      smartError: null,
    });
    this.deps = deps;
    this.onlineResearchDeps = onlineResearchDeps;
    this.routingDeps = routingDeps;
    this.locationService = locationService;
    this.nav = nav;
    this.smartRouteRequestId = 0;
  }

  onInit = () => {
    void this.load();
  };

  get results() {
    const normalizedQuery = this.state.query.trim().toLowerCase();
    return this.state.items.filter(item => {
      const matchesCategory = this.state.category === 'all'
        || item.destination.category === this.state.category;
      const matchesQuery = !normalizedQuery
        || [
          item.destination.name,
          item.destination.area,
          item.destination.municipality,
          item.destination.summary,
        ].some(value => value.toLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });
  }

  get smartResults() {
    return recommendTourismPlaces(
      this.state.smartCatalog,
      this.state.smartPreferences,
      {
        origin: this.state.smartFix,
        routeEstimates: this.state.smartRouteEstimates,
      },
    );
  }

  get selectedSmartResults() {
    const selected = new Set(this.state.smartSelectedIds);
    return this.smartResults.filter(place => selected.has(place.id));
  }

  setQuery = query => {
    this.setState({ query });
  };

  setCategory = category => {
    this.setState({ category });
  };

  toggleSmartOpen = () => {
    this.setState(previous => ({ smartOpen: !previous.smartOpen, smartError: null }));
  };

  toggleSmartInterest = interest => {
    this.setState(previous => {
      const selected = previous.smartPreferences.interests.includes(interest);
      return {
        smartPreferences: {
          ...previous.smartPreferences,
          interests: selected
            ? previous.smartPreferences.interests.filter(value => value !== interest)
            : [...previous.smartPreferences.interests, interest],
        },
        smartSelectedIds: [],
        smartError: null,
      };
    });
    if (this.state.smartFix) void this.refreshSmartRoutes();
  };

  setSmartPreference = (key, value) => {
    this.setState(previous => ({
      smartPreferences: {
        ...previous.smartPreferences,
        [key]: value,
      },
      smartRouteEstimates: key === 'travelMode' ? {} : previous.smartRouteEstimates,
      smartSelectedIds: [],
      smartError: null,
    }));
    if (this.state.smartFix && ['travelMode', 'walking', 'ferry', 'savedOnly'].includes(key)) {
      void this.refreshSmartRoutes();
    }
  };

  load = async () => {
    this.setState({ loading: true });
    try {
      const { items, source } = await listDestinationsWithState(this.deps);
      const smartCatalog = await loadSmartExploreCatalog(this.deps, items).catch(() => []);
      this.setState({
        items,
        smartCatalog,
        source,
        error: null,
      });
    } catch (error) {
      this.setState({
        error: userMessage(error, 'Destination information could not be loaded.'),
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  useCurrentLocation = async () => {
    if (!this.locationService) {
      this.setState({
        smartLocationStatus: 'unavailable',
        smartError: 'Location is unavailable. Smart Explore can still rank places without proximity.',
      });
      return false;
    }
    this.setState({ smartLocationStatus: 'loading', smartError: null });
    try {
      const granted = await this.locationService.requestPermissions();
      if (!granted) {
        this.setState({
          smartLocationStatus: 'denied',
          smartFix: null,
          smartRouteEstimates: {},
          smartError: 'Location permission was not granted. Recommendations still work without distance ranking.',
        });
        return false;
      }
      const fix = await this.locationService.getCurrentFix();
      if (!fix) {
        this.setState({
          smartLocationStatus: 'unavailable',
          smartFix: null,
          smartRouteEstimates: {},
          smartError: 'LakBai could not get a GPS fix. Recommendations still work without distance ranking.',
        });
        return false;
      }
      this.setState({
        smartLocationStatus: 'ready',
        smartFix: fix,
        smartRouteEstimates: {},
      });
      await this.refreshSmartRoutes(fix);
      return true;
    } catch (error) {
      this.setState({
        smartLocationStatus: 'unavailable',
        smartError: userMessage(error, 'Current location could not be used for Smart Explore.'),
      });
      return false;
    }
  };

  refreshSmartRoutes = async (origin = this.state.smartFix) => {
    if (!origin || !this.routingDeps.routingGraphRepository) return;
    const requestId = this.smartRouteRequestId + 1;
    this.smartRouteRequestId = requestId;
    const preliminary = recommendTourismPlaces(
      this.state.smartCatalog,
      this.state.smartPreferences,
      { origin },
    );
    const mode = this.state.smartPreferences.travelMode;
    this.setState({ smartRouting: true });
    try {
      const estimates = await estimateRecommendationRoutes({
        routingGraphRepository: this.routingDeps.routingGraphRepository,
        origin,
        recommendations: preliminary,
        mode,
        limit: 8,
      });
      if (this.smartRouteRequestId === requestId && this.state.smartFix === origin) {
        this.setState({ smartRouteEstimates: estimates });
      }
    } finally {
      if (this.smartRouteRequestId === requestId) {
        this.setState({ smartRouting: false });
      }
    }
  };

  toggleSmartSelection = placeId => {
    const alreadySelected = this.state.smartSelectedIds.includes(placeId);
    if (alreadySelected) {
      this.setState(previous => ({
        smartSelectedIds: previous.smartSelectedIds.filter(id => id !== placeId),
        smartError: null,
      }));
      return { ok: true, message: '' };
    }
    if (this.state.smartSelectedIds.length >= 4) {
      return { ok: false, message: 'Smart trips support up to 4 selected stops.' };
    }
    this.setState(previous => ({
      smartSelectedIds: [...previous.smartSelectedIds, placeId],
      smartError: null,
    }));
    return { ok: true, message: '' };
  };

  buildSmartTrip = () => {
    const draft = buildSmartTripDraft({
      recommendations: this.smartResults,
      selectedIds: this.state.smartSelectedIds,
      origin: this.state.smartFix,
      travelMode: this.state.smartPreferences.travelMode,
    });
    if (!draft) {
      this.setState({ smartError: 'Select at least 2 recommended places to build a trip.' });
      return false;
    }
    this.setState({ smartError: null });
    this.nav.onPlanTrip?.(draft);
    return true;
  };

  openSmartDestination = place => {
    if (place?.destinationId) this.nav.onOpenDestination?.(place.destinationId);
  };

  searchWeb = async () => {
    this.setState({ onlineSearching: true });
    try {
      await searchTourismWeb(this.onlineResearchDeps, this.state.query);
      return { ok: true, message: '' };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The web search could not be opened. Check your connection and try again.'),
      };
    } finally {
      this.setState({ onlineSearching: false });
    }
  };

  save = async packId => {
    this.setState({ busyId: packId });
    try {
      const pack = await savePackToLibrary(this.deps, packId);
      this.patchItem(packId, {
        saved: true,
        savedVersion: pack.version,
        updateAvailable: false,
      });
      return { ok: true, message: `${pack.destination.name} is ready for offline use.` };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The destination pack could not be saved.'),
      };
    } finally {
      this.setState({ busyId: null });
    }
  };

  update = async packId => {
    this.setState({ busyId: packId });
    try {
      const pack = await savePackToLibrary(this.deps, packId);
      this.patchItem(packId, {
        saved: true,
        savedVersion: pack.version,
        updateAvailable: false,
      });
      return { ok: true, message: `${pack.destination.name} offline files updated.` };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The saved destination pack could not be updated.'),
      };
    } finally {
      this.setState({ busyId: null });
    }
  };

  toggleFavorite = async packId => {
    const item = this.state.items.find(entry => entry.destination.id === packId);
    if (!item) return { ok: false, message: 'Destination not found.' };
    try {
      const favorite = await toggleDestinationFavorite(this.deps, packId, item.favorite);
      this.patchItem(packId, { favorite });
      return {
        ok: true,
        message: favorite ? 'Added to Favorites.' : 'Removed from Favorites.',
      };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'Favorite could not be updated.'),
      };
    }
  };

  removeFromLibrary = async packId => {
    this.setState({ busyId: packId });
    try {
      await removePackFromLibrary(this.deps, packId);
      this.patchItem(packId, {
        saved: false,
        savedVersion: null,
        updateAvailable: false,
      });
      return { ok: true, message: 'Pack removed from your local library.' };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The destination pack could not be removed.'),
      };
    } finally {
      this.setState({ busyId: null });
    }
  };

  patchItem = (packId, patch) => {
    this.setState(previous => ({
      items: previous.items.map(item => item.destination.id === packId
        ? { ...item, ...patch }
        : item),
      smartCatalog: previous.smartCatalog.map(place => (
        place.destinationId === packId && Object.hasOwn(patch, 'saved')
          ? { ...place, saved: Boolean(patch.saved) }
          : place
      )),
    }));
  };
}
