import { listDestinationsWithState } from "../../domain/usecases/destinationPacks.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";
/** Home dashboard: readiness, featured packs, quick actions. */
export class HomeViewModel extends ViewModel {
  constructor(deps, nav) {
    super({
      loading: true,
      items: [],
      downloadedCount: 0,
      source: null,
      error: null
    });
    this.deps = deps;
    this.nav = nav;
  }
  onInit = () => {
    void this.load();
  };
  load = async (forceRefresh = false) => {
    this.setState({
      loading: true
    });
    try {
      const {
        items,
        source
      } = await listDestinationsWithState(this.deps, {
        forceRefresh
      });
      this.setState({
        items,
        source,
        error: null,
        downloadedCount: items.filter(item => item.downloaded).length
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
  refresh = () => {
    void this.load(true);
  };
  openExplore = query => {
    this.nav.onOpenExplore(query);
  };
  openDownloads = () => {
    this.nav.onOpenDownloads();
  };
  openDestination = destinationId => {
    this.nav.onOpenDestination(destinationId);
  };
}
