import { SessionViewModel } from '../src/presentation/viewmodels/SessionViewModel.jsx';

describe('SessionViewModel device-local setup', () => {
  test('restores directly to main when preferences exist', async () => {
    const preferencesRepository = {
      get: jest.fn().mockResolvedValue({ pace: 'balanced' }),
      clear: jest.fn(),
    };
    const vm = new SessionViewModel({ preferencesRepository });

    await vm.restore();

    expect(vm.state.phase).toBe('main');
  });

  test('restart setup clears only travel preferences and returns to landing', async () => {
    const preferencesRepository = {
      get: jest.fn(),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    const vm = new SessionViewModel({ preferencesRepository });
    vm.setState({ phase: 'main' });

    await vm.restartSetup();

    expect(preferencesRepository.clear).toHaveBeenCalledTimes(1);
    expect(vm.state.phase).toBe('landing');
  });
});
