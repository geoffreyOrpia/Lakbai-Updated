import { getTravelPreferences } from "../../domain/usecases/preferences.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";
/** Device-local flow with no account or authentication gate. */
export class SessionViewModel extends ViewModel {
  constructor(deps) {
    super({
      phase: 'restoring'
    });
    this.deps = deps;
  }
  onInit = () => {
    void this.restore();
  };
  restore = async () => {
    try {
      const preferences = await getTravelPreferences(this.deps);
      this.setState({
        phase: preferences ? 'main' : 'landing'
      });
    } catch {
      this.setState({
        phase: 'landing'
      });
    }
  };
  dismissLanding = () => {
    this.setState({
      phase: 'onboarding'
    });
  };
  completeOnboarding = () => {
    this.setState({
      phase: 'main'
    });
  };
}
