import {
  listDestinationsWithState,
  loadOfflineBundleStatus,
  removePackFromLibrary,
  savePackToLibrary
} from "../../domain/usecases/destinationPacks.jsx";
import { toggleDestinationFavorite } from "../../domain/usecases/favorites.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

/** Local Library management for bundled destination packs. */
export class LibraryViewModel extends ViewModel {
  constructor(deps) {
    super({
      items: [],
      loading: true,
      busyId: null,
      error: null
    });
    this.deps = deps;
  }
  onInit = () => {
    void this.load();
  };
  get saved() {
    return this.state.items.filter(item => item.saved);
  }
  get favorites() {
    return this.state.items.filter(item => item.favorite);
  }
  get available() {
    return this.state.items.filter(item => item.destination.status === 'available' && !item.saved);
  }
  get totalOfflineSizeBytes() {
    const packBytes = this.saved.reduce((total, item) => total + (item.offlineBundle?.sizeBytes ?? 0), 0);
    const sharedBasemapBytes = this.saved.reduce(
      (largest, item) => Math.max(largest, item.offlineBundle?.basemapSizeBytes ?? 0),
      0,
    );
    return packBytes + sharedBasemapBytes;
  }
  load = async () => {
    this.setState({
      loading: true
    });
    try {
      const {
        items
      } = await listDestinationsWithState(this.deps);
      const enriched = await Promise.all(items.map(async item => ({
        ...item,
        offlineBundle: item.saved
          ? await loadOfflineBundleStatus(this.deps, item.destination.id)
          : null,
      })));
      this.setState({
        items: enriched,
        error: null
      });
    } catch (error) {
      this.setState({
        error: userMessage(error, 'Your saved places could not load.')
      });
    } finally {
      this.setState({
        loading: false
      });
    }
  };
  save = async packId => {
    this.setState({
      busyId: packId
    });
    try {
      const pack = await savePackToLibrary(this.deps, packId);
      const offlineBundle = await loadOfflineBundleStatus(this.deps, packId);
      this.patchItem(packId, {
        saved: true,
        savedVersion: pack.version,
        updateAvailable: false,
        offlineBundle
      });
      return {
        ok: true,
        message: `${pack.destination.name} saved for offline use.`
      };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The guide could not be saved.')
      };
    } finally {
      this.setState({
        busyId: null
      });
    }
  };
  update = async packId => {
    this.setState({
      busyId: packId
    });
    try {
      const pack = await savePackToLibrary(this.deps, packId);
      const offlineBundle = await loadOfflineBundleStatus(this.deps, packId);
      this.patchItem(packId, {
        saved: true,
        savedVersion: pack.version,
        updateAvailable: false,
        offlineBundle
      });
      return {
        ok: true,
        message: `${pack.destination.name} offline guide updated.`
      };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The saved guide could not be updated.')
      };
    } finally {
      this.setState({
        busyId: null
      });
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
        message: favorite ? 'Added to Favorites.' : 'Removed from Favorites.'
      };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'Favorite could not be updated.')
      };
    }
  };
  removeFromLibrary = async packId => {
    this.setState({
      busyId: packId
    });
    try {
      const item = this.state.items.find(entry => entry.destination.id === packId);
      await removePackFromLibrary(this.deps, packId);
      this.patchItem(packId, {
        saved: false,
        savedVersion: null,
        updateAvailable: false,
        offlineBundle: null
      });
      return {
        ok: true,
        message: `${item?.destination.name ?? 'Guide'} removed from offline storage. Your favorites and trips are kept.`
      };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The offline guide could not be removed.')
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
