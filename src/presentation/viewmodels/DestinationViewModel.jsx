import { downloadPack, loadPackForViewing, removePack } from "../../domain/usecases/destinationPacks.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { openDirectionsToPlace } from "../../domain/usecases/directions.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";
/** Destination detail: bundled preview, library state, trails, and notes. */
export class DestinationViewModel extends ViewModel {
  constructor(deps, destinationId, nav, directionsDeps) {
    super({
      pack: null,
      source: 'none',
      loading: true,
      busy: false,
      directionsBusyId: null,
      downloaded: false,
      error: null
    });
    this.deps = deps;
    this.destinationId = destinationId;
    this.nav = nav;
    this.directionsDeps = directionsDeps;
  }
  onInit = () => {
    void this.load();
  };
  load = async () => {
    this.setState({
      loading: true,
      error: null
    });
    try {
      const {
        pack,
        source
      } = await loadPackForViewing(this.deps, this.destinationId);
      this.setState({
        pack,
        source,
        downloaded: source === 'local',
        error: pack || source === 'bundled' ? null : 'This destination pack is not bundled with this version of LakbayLokal yet.'
      });
    } catch (error) {
      this.setState({
        pack: null,
        source: 'none',
        downloaded: false,
        error: userMessage(error, 'This destination could not be loaded from local storage.')
      });
    } finally {
      this.setState({
        loading: false
      });
    }
  };
  download = async () => {
    this.setState({
      busy: true
    });
    try {
      const pack = await downloadPack(this.deps, this.destinationId);
      this.setState({
        pack,
        source: 'local',
        downloaded: true
      });
      return {
        ok: true,
        message: `${pack.destination.name} is ready for offline use.`
      };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The pack could not be saved.')
      };
    } finally {
      this.setState({
        busy: false
      });
    }
  };
  remove = async () => {
    this.setState({
      busy: true
    });
    try {
      await removePack(this.deps, this.destinationId);
      this.setState({
        downloaded: false
      });
      return {
        ok: true,
        message: 'Removed from your local library.'
      };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The pack could not be removed.')
      };
    } finally {
      this.setState({
        busy: false
      });
    }
  };
  openTrail = trailId => {
    this.nav.onOpenTrail(trailId);
  };
  openDirections = async (place) => {
    const destination = this.state.pack?.destination;
    if (!destination) {
      return {
        ok: false,
        message: 'This destination is not available.'
      };
    }
    const placeId = place.id ?? destination.id;
    this.setState({
      directionsBusyId: placeId
    });
    try {
      await openDirectionsToPlace(this.directionsDeps, place, destination);
      return {
        ok: true,
        message: 'Directions opened. Choose “Your location” in Maps when prompted.'
      };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'Directions could not be opened. Check your connection and try again.')
      };
    } finally {
      this.setState({
        directionsBusyId: null
      });
    }
  };
  back = () => {
    this.nav.onBack();
  };
}
