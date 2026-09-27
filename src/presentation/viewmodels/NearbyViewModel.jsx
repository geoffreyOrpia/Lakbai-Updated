import { loadNearbySavedPlaces } from "../../domain/usecases/nearbyPlaces.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

export class NearbyViewModel extends ViewModel {
  constructor(destinationDeps, locationService, nav) {
    super({
      loading: true,
      permission: 'unknown',
      fix: null,
      places: [],
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

  load = async () => {
    this.setState({
      loading: true,
      error: null,
    });
    try {
      const savedMeta = await this.destinationDeps.packRepository.listSavedMeta();
      if (!savedMeta.length) {
        this.setState({
          places: [],
          savedPackCount: 0,
          permission: 'unknown',
          fix: null,
        });
        return;
      }

      const granted = await this.locationService.requestPermissions();
      if (!granted) {
        this.setState({
          permission: 'denied',
          places: [],
          savedPackCount: savedMeta.length,
          fix: null,
        });
        return;
      }

      const fix = await this.locationService.getCurrentFix();
      if (!fix) {
        this.setState({
          permission: 'granted',
          places: [],
          savedPackCount: savedMeta.length,
          fix: null,
          error: 'LakBai could not get a current GPS position. Move to an open area and try again.',
        });
        return;
      }

      const places = await loadNearbySavedPlaces(this.destinationDeps, fix);
      this.setState({
        permission: 'granted',
        fix,
        places,
        savedPackCount: savedMeta.length,
      });
    } catch (error) {
      this.setState({
        error: userMessage(error, 'Nearby places could not be prepared from local data.'),
      });
    } finally {
      this.setState({
        loading: false,
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
