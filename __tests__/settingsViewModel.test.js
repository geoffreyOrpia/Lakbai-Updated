import { SettingsViewModel } from '../src/presentation/viewmodels/SettingsViewModel.jsx';

const createVm = () => {
  const preferencesRepository = {
    get: jest.fn().mockResolvedValue({
      interests: ['Beaches'],
      pace: 'balanced',
      offlineFirst: true,
    }),
    save: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };
  const destinationDeps = {
    destinationRepository: {
      getDestinations: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'samal',
            name: 'Samal',
            area: 'Samal',
            municipality: 'Samal',
            category: 'island',
            summary: 'Island',
            status: 'available',
          },
        ],
        source: 'bundled',
      }),
    },
    packRepository: {
      listSavedMeta: jest.fn().mockResolvedValue([{ packId: 'samal', version: 1 }]),
      listManifests: jest.fn().mockResolvedValue([{ id: 'samal', version: 1 }]),
      getOfflineBundleStatus: jest.fn().mockResolvedValue({
        sizeBytes: 2048,
        basemapSizeBytes: 4096,
      }),
    },
    favoriteRepository: {
      listFavoriteIds: jest.fn().mockResolvedValue([]),
    },
  };
  const navigationSessionRepository = {
    getActiveSession: jest.fn().mockResolvedValue({ version: 1 }),
    clearActiveSession: jest.fn().mockResolvedValue(undefined),
  };
  const callbacks = {
    onBack: jest.fn(),
    onRestartSetup: jest.fn().mockResolvedValue(undefined),
  };
  const vm = new SettingsViewModel(
    { preferencesRepository },
    destinationDeps,
    { navigationSessionRepository },
    callbacks,
  );
  return {
    vm,
    preferencesRepository,
    navigationSessionRepository,
    callbacks,
  };
};

describe('SettingsViewModel', () => {
  test('loads preferences, local pack summary, and navigation recovery state', async () => {
    const { vm } = createVm();

    await vm.load();

    expect(vm.state.preferences).toEqual({
      interests: ['Beaches'],
      pace: 'balanced',
      offlineFirst: true,
    });
    expect(vm.state.savedPackCount).toBe(1);
    expect(vm.state.offlineSizeBytes).toBe(6144);
    expect(vm.state.navigationRecoveryAvailable).toBe(true);
  });

  test('saves edited preferences without touching other local user data', async () => {
    const { vm, preferencesRepository } = createVm();
    vm.toggleInterest('Wildlife');
    vm.setPace('chill');
    vm.setOfflineFirst(false);

    const result = await vm.save();

    expect(result.ok).toBe(true);
    expect(preferencesRepository.save).toHaveBeenCalledWith({
      interests: ['Wildlife'],
      pace: 'chill',
      offlineFirst: false,
    });
  });

  test('clears only navigation recovery through the routing repository', async () => {
    const { vm, navigationSessionRepository, preferencesRepository } = createVm();
    vm.setState({ navigationRecoveryAvailable: true });

    const result = await vm.clearNavigationRecovery();

    expect(result.ok).toBe(true);
    expect(navigationSessionRepository.clearActiveSession).toHaveBeenCalledTimes(1);
    expect(preferencesRepository.clear).not.toHaveBeenCalled();
    expect(vm.state.navigationRecoveryAvailable).toBe(false);
  });

  test('delegates restart setup without deleting trips or packs', async () => {
    const { vm, callbacks, preferencesRepository } = createVm();

    const result = await vm.restartSetup();

    expect(result.ok).toBe(true);
    expect(callbacks.onRestartSetup).toHaveBeenCalledTimes(1);
    expect(preferencesRepository.clear).not.toHaveBeenCalled();
  });
});
