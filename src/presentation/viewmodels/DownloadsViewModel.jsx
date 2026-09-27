import { downloadPack, listDestinationsWithState, removePack } from "../../domain/usecases/destinationPacks.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";
/** Offline library management for bundled packs saved to the user's library. */
export class DownloadsViewModel extends ViewModel {
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
  get downloaded() {
    return this.state.items.filter(item => item.downloaded);
  }
  get available() {
    return this.state.items.filter(item => item.destination.status === 'available' && !item.downloaded);
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
        error: userMessage(error, 'Your offline library could not be loaded.')
      });
    } finally {
      this.setState({
        loading: false
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
        message: `${pack.destination.name} saved to your offline library.`
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
      const item = this.state.items.find(entry => entry.destination.id === packId);
      await removePack(this.deps, packId);
      this.patchItem(packId, {
        downloaded: false,
        downloadedVersion: null,
        updateAvailable: false
      });
      return {
        ok: true,
        message: `${item?.destination.name ?? 'Pack'} removed from your library.`
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
