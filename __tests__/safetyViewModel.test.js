import { SafetyViewModel } from '../src/presentation/viewmodels/SafetyViewModel.jsx';

describe('SafetyViewModel emergency calling', () => {
  test('Call 911 works without requiring a saved destination guide', async () => {
    const phoneService = {
      call: jest.fn().mockResolvedValue(undefined),
    };
    const vm = new SafetyViewModel(
      {
        safetyRepository: {},
        phoneService,
      },
      {
        listSavedMeta: jest.fn().mockResolvedValue([]),
      },
    );

    const result = await vm.call911();

    expect(result.ok).toBe(true);
    expect(phoneService.call).toHaveBeenCalledTimes(1);
    expect(phoneService.call).toHaveBeenCalledWith('911');
  });

  test('returns a useful error when the device cannot open 911', async () => {
    const phoneService = {
      call: jest.fn().mockRejectedValue(new Error('Calling is not available on this device.')),
    };
    const vm = new SafetyViewModel(
      {
        safetyRepository: {},
        phoneService,
      },
      {
        listSavedMeta: jest.fn().mockResolvedValue([]),
      },
    );

    const result = await vm.call911();

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Calling is not available');
  });
});
