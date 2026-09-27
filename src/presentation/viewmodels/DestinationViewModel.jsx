import { loadOfflineBundleStatus, loadPackForViewing, loadPackLibraryState, removePackFromLibrary, savePackToLibrary } from "../../domain/usecases/destinationPacks.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { openDirectionsToPlace } from "../../domain/usecases/directions.jsx";
import { isFavoriteDestination, toggleDestinationFavorite } from "../../domain/usecases/favorites.jsx";
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
      saved: false,
      savedVersion: null,
      updateAvailable: false,
      offlineBundle: null,
      favorite: false,
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
      const [{
        pack,
        source
      }, favorite, libraryState] = await Promise.all([
        loadPackForViewing(this.deps, this.destinationId),
        isFavoriteDestination(this.deps, this.destinationId),
        loadPackLibraryState(this.deps, this.destinationId),
      ]);
      const offlineBundle = libraryState.saved
        ? await loadOfflineBundleStatus(this.deps, this.destinationId)
        : null;
      this.setState({
        pack,
        source,
        saved: libraryState.saved,
        savedVersion: libraryState.savedVersion,
        updateAvailable: libraryState.updateAvailable,
        offlineBundle,
        favorite,
        error: pack || source === 'bundled' ? null : 'This destination pack is not bundled with this version of LakBai yet.'
      });
    } catch (error) {
      this.setState({
        pack: null,
        source: 'none',
        saved: false,
        savedVersion: null,
        updateAvailable: false,
        offlineBundle: null,
        error: userMessage(error, 'This destination could not be loaded from local storage.')
      });
    } finally {
      this.setState({
        loading: false
      });
    }
  };
  toggleFavorite = async () => {
    try {
      const favorite = await toggleDestinationFavorite(this.deps, this.destinationId, this.state.favorite);
      this.setState({
        favorite
      });
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
  saveToLibrary = async (updating = false) => {
    this.setState({
      busy: true
    });
    try {
      const pack = await savePackToLibrary(this.deps, this.destinationId);
      const offlineBundle = await loadOfflineBundleStatus(this.deps, this.destinationId);
      this.setState({
        pack,
        source: 'library',
        saved: true,
        savedVersion: pack.version,
        updateAvailable: false,
        offlineBundle
      });
      return {
        ok: true,
        message: updating
          ? `${pack.destination.name} offline files updated.`
          : `${pack.destination.name} is ready for offline use.`
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
  removeFromLibrary = async () => {
    this.setState({
      busy: true
    });
    try {
      await removePackFromLibrary(this.deps, this.destinationId);
      this.setState({
        saved: false,
        savedVersion: null,
        updateAvailable: false,
        offlineBundle: null
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
  planRoute = route => {
    const destination = this.state.pack?.destination;
    if (!destination || !route || !this.nav.onPlanRoute) return;
    this.nav.onPlanRoute({
      destinationId: destination.id,
      destinationName: destination.name,
      municipality: destination.municipality,
      routeId: route.id,
      routeName: route.name,
      description: route.description,
      planningOnly: true,
      stops: (route.stops ?? []).map(stop => ({
        id: stop.id,
        name: stop.name,
        note: stop.note,
      })),
    });
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
