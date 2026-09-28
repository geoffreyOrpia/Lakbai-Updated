import { getTravelPreferences, saveTravelPreferences } from "../../domain/usecases/preferences.jsx";
import {
  listDestinationsWithState,
  loadOfflineBundleStatus,
} from "../../domain/usecases/destinationPacks.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

export const SETTINGS_INTEREST_OPTIONS = Object.freeze([
  'Beaches',
  'Waterfalls',
  'Hiking',
  'Wildlife',
  'Culture',
  'Food trips',
  'City strolls',
  'Photography',
]);

export const SETTINGS_PACE_OPTIONS = Object.freeze([
  { key: 'chill', label: 'Chill' },
  { key: 'balanced', label: 'Balanced' },
  { key: 'packed', label: 'Packed' },
]);

const DEFAULTS = Object.freeze({
  interests: [],
  pace: 'balanced',
  offlineFirst: true,
});

export class SettingsViewModel extends ViewModel {
  constructor(preferencesDeps, destinationDeps, routingDeps, callbacks = {}) {
    super({
      loading: true,
      saving: false,
      preferences: { ...DEFAULTS },
      savedPackCount: 0,
      offlineSizeBytes: 0,
      navigationRecoveryAvailable: false,
      error: null,
    });
    this.preferencesDeps = preferencesDeps;
    this.destinationDeps = destinationDeps;
    this.routingDeps = routingDeps;
    this.callbacks = callbacks;
  }

  onInit = () => {
    void this.load();
  };

  load = async () => {
    this.setState({ loading: true, error: null });
    try {
      const [preferences, { items }, activeSession] = await Promise.all([
        getTravelPreferences(this.preferencesDeps),
        listDestinationsWithState(this.destinationDeps),
        this.routingDeps.navigationSessionRepository?.getActiveSession?.().catch(() => null),
      ]);
      const saved = items.filter(item => item.saved);
      const bundles = await Promise.all(saved.map(item => (
        loadOfflineBundleStatus(this.destinationDeps, item.destination.id).catch(() => null)
      )));
      const packBytes = bundles.reduce((sum, bundle) => sum + (bundle?.sizeBytes ?? 0), 0);
      const sharedBasemapBytes = bundles.reduce(
        (largest, bundle) => Math.max(largest, bundle?.basemapSizeBytes ?? 0),
        0,
      );
      this.setState({
        preferences: {
          ...DEFAULTS,
          ...(preferences ?? {}),
        },
        savedPackCount: saved.length,
        offlineSizeBytes: packBytes + sharedBasemapBytes,
        navigationRecoveryAvailable: Boolean(activeSession),
      });
    } catch (error) {
      this.setState({
        error: userMessage(error, 'Settings could not be loaded.'),
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  toggleInterest = interest => {
    this.setState(previous => {
      const selected = previous.preferences.interests.includes(interest);
      return {
        preferences: {
          ...previous.preferences,
          interests: selected
            ? previous.preferences.interests.filter(value => value !== interest)
            : [...previous.preferences.interests, interest],
        },
      };
    });
  };

  setPace = pace => {
    this.setState(previous => ({
      preferences: {
        ...previous.preferences,
        pace,
      },
    }));
  };

  setOfflineFirst = offlineFirst => {
    this.setState(previous => ({
      preferences: {
        ...previous.preferences,
        offlineFirst: Boolean(offlineFirst),
      },
    }));
  };

  save = async () => {
    this.setState({ saving: true, error: null });
    try {
      await saveTravelPreferences(this.preferencesDeps, this.state.preferences);
      return { ok: true, message: 'Travel preferences saved on this device.' };
    } catch (error) {
      const message = userMessage(error, 'Travel preferences could not be saved.');
      this.setState({ error: message });
      return { ok: false, message };
    } finally {
      this.setState({ saving: false });
    }
  };

  clearNavigationRecovery = async () => {
    try {
      await this.routingDeps.navigationSessionRepository?.clearActiveSession?.();
      this.setState({ navigationRecoveryAvailable: false });
      return { ok: true, message: 'Saved navigation recovery cleared.' };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'Saved navigation recovery could not be cleared.'),
      };
    }
  };

  restartSetup = async () => {
    try {
      await this.callbacks.onRestartSetup?.();
      return { ok: true, message: '' };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'LakBai setup could not be restarted.'),
      };
    }
  };

  back = () => this.callbacks.onBack?.();
}
