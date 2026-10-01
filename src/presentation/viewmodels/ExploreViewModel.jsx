import { listDestinationsWithState, removePackFromLibrary, savePackToLibrary } from "../../domain/usecases/destinationPacks.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { searchTourismWeb } from "../../domain/usecases/onlineResearch.jsx";
import { toggleDestinationFavorite } from "../../domain/usecases/favorites.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

/** Explore catalog and search/filter behavior. */
export class ExploreViewModel extends ViewModel {
  constructor(deps, onlineResearchDeps) {
    super({
      items: [],
      query: '',
      category: 'all',
      resultLimit: 8,
      loading: true,
      onlineSearching: false,
      busyId: null,
      source: null,
      error: null,
    });
    this.deps = deps;
    this.onlineResearchDeps = onlineResearchDeps;
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

  get visibleResults() {
    return this.results.slice(0, this.state.resultLimit);
  }

  get hasMoreResults() {
    return this.results.length > this.state.resultLimit;
  }

  loadMoreResults = () => {
    this.setState(previous => ({ resultLimit: previous.resultLimit + 8 }));
  };

  setQuery = query => {
    this.setState({ query, resultLimit: 8 });
  };

  setCategory = category => {
    this.setState({ category, resultLimit: 8 });
  };

  load = async () => {
    this.setState({ loading: true });
    try {
      const { items, source } = await listDestinationsWithState(this.deps);
      this.setState({
        items,
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
        message: userMessage(error, 'The guide could not be saved.'),
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
      return { ok: true, message: `${pack.destination.name} offline guide updated.` };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The saved guide could not be updated.'),
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
      return { ok: true, message: 'Offline guide removed. Your favorites and trips are kept.' };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The downloaded guide could not be removed.'),
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
    }));
  };
}
