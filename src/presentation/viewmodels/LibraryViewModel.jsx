import { listDestinationsWithState, removePackFromLibrary, savePackToLibrary } from "../../domain/usecases/destinationPacks.jsx";
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
  get available() {
    return this.state.items.filter(item => item.destination.status === 'available' && !item.saved);
  }
  load = async () => {
    this.setState({
      loading: true
    });
    try {
      const {
        items
      } = await listDestinationsWithState(this.deps);
      this.setState({
        items,
        error: null
      });
    } catch (error) {
      this.setState({
        error: userMessage(error, 'Your local Library could not be loaded.')
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
      this.patchItem(packId, {
        saved: true,
        savedVersion: pack.version,
        updateAvailable: false
      });
      return {
        ok: true,
        message: `${pack.destination.name} saved to your local Library.`
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
        updateAvailable: false
      });
      return {
        ok: true,
        message: `${item?.destination.name ?? 'Pack'} removed from your Library.`
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
