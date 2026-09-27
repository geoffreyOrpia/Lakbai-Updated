import { listDestinationsWithState } from "../../domain/usecases/destinationPacks.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";
/** Home dashboard: readiness, featured packs, quick actions. */
export class HomeViewModel extends ViewModel {
  constructor(deps, nav) {
    super({
      loading: true,
      items: [],
      savedCount: 0,
      source: null,
      error: null
    });
    this.deps = deps;
    this.nav = nav;
  }
  onInit = () => {
    void this.load();
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
        error: null,
        savedCount: items.filter(item => item.saved).length
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
  openExplore = query => {
    this.nav.onOpenExplore(query);
  };
  openLibrary = () => {
    this.nav.onOpenLibrary();
  };
  openDestination = destinationId => {
    this.nav.onOpenDestination(destinationId);
  };
}
