import { saveTravelPreferences } from "../../domain/usecases/preferences.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";
export const INTEREST_OPTIONS = ['Beaches', 'Waterfalls', 'Hiking', 'Wildlife', 'Culture', 'Food trips', 'City strolls', 'Photography'];
export const PACE_OPTIONS = [{
  key: 'chill',
  label: 'Chill',
  text: 'A few relaxed stops per day.'
}, {
  key: 'balanced',
  label: 'Balanced',
  text: 'A good mix of sights and rest.'
}, {
  key: 'packed',
  label: 'Packed',
  text: 'See as much as possible daily.'
}];
/** Two-step travel setup saved only on this device. */
export class OnboardingViewModel extends ViewModel {
  constructor(deps, callbacks) {
    super({
      step: 0,
      interests: [],
      pace: 'balanced',
      offlineFirst: true,
      saving: false,
      error: ''
    });
    this.deps = deps;
    this.callbacks = callbacks;
  }
  toggleInterest = interest => {
    this.setState(previous => ({
      interests: previous.interests.includes(interest) ? previous.interests.filter(entry => entry !== interest) : [...previous.interests, interest]
    }));
  };
  setPace = pace => {
    this.setState({
      pace
    });
  };
  setOfflineFirst = value => {
    this.setState({
      offlineFirst: value
    });
  };
  next = () => {
    if (this.state.step === 0 && this.state.interests.length === 0) {
      this.setState({
        error: 'Pick at least one travel interest.'
      });
      return;
    }
    this.setState({
      step: 1,
      error: ''
    });
  };
  back = () => {
    this.setState({
      step: 0,
      error: ''
    });
  };
  complete = async () => {
    this.setState({
      saving: true,
      error: ''
    });
    try {
      await saveTravelPreferences(this.deps, {
        interests: this.state.interests,
        pace: this.state.pace,
        offlineFirst: this.state.offlineFirst
      });
      this.callbacks.onComplete();
      return true;
    } catch (error) {
      this.setState({
        error: error instanceof Error ? error.message : 'Your travel setup could not be saved.'
      });
      return false;
    } finally {
      this.setState({
        saving: false
      });
    }
  };
}
