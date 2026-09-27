import { downloadPack, listDestinationsWithState, removePack } from "../../domain/usecases/destinationPacks.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { searchTourismWeb } from "../../domain/usecases/onlineResearch.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";
/** Explore catalog with search, categories, and pack download actions. */
export class ExploreViewModel extends ViewModel {
  constructor(deps, onlineResearchDeps) {
    super({
      items: [],
      query: '',
      category: 'all',
      loading: true,
      onlineSearching: false,
      busyId: null,
      source: null,
      error: null
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
      const matchesCategory = this.state.category === 'all' || item.destination.category === this.state.category;
      const matchesQuery = !normalizedQuery || [item.destination.name, item.destination.area, item.destination.municipality, item.destination.summary].some(value => value.toLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });
  }
  setQuery = query => {
    this.setState({
      query
    });
  };
  setCategory = category => {
    this.setState({
      category
    });
  };
  load = async () => {
    this.setState({
      loading: true
    });
    try {
      const {
        items,
        source
      } = await listDestinationsWithState(this.deps);
      this.setState({
        items,
        source,
        error: null
      });
    } catch (error) {
      this.setState({
        error: userMessage(error, 'Destination information could not be loaded.')
      });
    } finally {
      this.setState({
        loading: false
      });
    }
  };
  searchWeb = async () => {
    this.setState({
      onlineSearching: true
    });
    try {
      await searchTourismWeb(this.onlineResearchDeps, this.state.query);
      return {
        ok: true,
        message: ''
      };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The web search could not be opened. Check your connection and try again.')
      };
    } finally {
      this.setState({
        onlineSearching: false
      });
    }
  };
  download = async packId => {
    this.setState({
      busyId: packId
    });
    try {
      const pack = await downloadPack(this.deps, packId);
      this.patchItem(packId, {
        downloaded: true,
        downloadedVersion: pack.version,
        updateAvailable: false
      });
      return {
        ok: true,
        message: `${pack.destination.name} is ready for offline use.`
      };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The destination pack could not be saved.')
      };
    } finally {
      this.setState({
        busyId: null
      });
    }
  };
  remove = async packId => {
    this.setState({
      busyId: packId
    });
    try {
      await removePack(this.deps, packId);
      this.patchItem(packId, {
        downloaded: false,
        downloadedVersion: null,
        updateAvailable: false
      });
      return {
        ok: true,
        message: 'Pack removed from your local library.'
      };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The destination pack could not be removed.')
      };
    } finally {
      this.setState({
        busyId: null
      });
    }
  };
  patchItem = (packId, patch) => {
    this.setState(previous => ({
      items: previous.items.map(item => item.destination.id === packId ? {
        ...item,
        ...patch
      } : item)
    }));
  };
}
