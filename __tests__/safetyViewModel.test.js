import { SafetyViewModel } from '../src/presentation/viewmodels/SafetyViewModel.jsx';

const createVm = ({
  savedMeta = [],
  savedPack = null,
  phoneService = {
    call: jest.fn().mockResolvedValue(undefined),
  },
} = {}) => {
  const packRepository = {
    listSavedMeta: jest.fn().mockResolvedValue(savedMeta),
    getBundledPack: jest.fn().mockResolvedValue(savedPack),
    getSavedPack: jest.fn(),
  };
  const vm = new SafetyViewModel(
    { phoneService },
    packRepository,
  );
  return { vm, packRepository, phoneService };
};

describe('SafetyViewModel', () => {
  test('Dial 911 works without requiring a saved destination guide', async () => {
    const { vm, phoneService } = createVm();

    const result = await vm.call911();

    expect(result.ok).toBe(true);
    expect(phoneService.call).toHaveBeenCalledTimes(1);
    expect(phoneService.call).toHaveBeenCalledWith('911');
  });

  test('returns a useful error when the device cannot open 911', async () => {
    const phoneService = {
      call: jest.fn().mockRejectedValue(new Error('Calling is not available on this device.')),
    };
    const { vm } = createVm({ phoneService });

    const result = await vm.call911();

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Calling is not available');
  });

  test('loads destination-specific safety reminders from saved guides', async () => {
    const { vm } = createVm({
      savedMeta: [{ packId: 'hagimit-falls' }],
      savedPack: {
        destination: {
          id: 'hagimit-falls',
          name: 'Hagimit Falls',
          area: 'Samal Island',
        },
        safety: {
          reminders: [
            'Avoid entering the water when current conditions are unsafe.',
            'Keep children closely supervised around moving water.',
          ],
          emergencyContacts: [{ label: 'National Emergency Hotline', phone: '911' }],
        },
      },
    });

    await vm.load();
    expect(vm.packRepository.getBundledPack).toHaveBeenCalledWith('hagimit-falls');
    expect(vm.packRepository.getSavedPack).not.toHaveBeenCalled();

    expect(vm.state.destinations).toEqual([{
      destinationId: 'hagimit-falls',
      name: 'Hagimit Falls',
      area: 'Samal Island',
      reminders: [
        'Avoid entering the water when current conditions are unsafe.',
        'Keep children closely supervised around moving water.',
      ],
    }]);
  });

  test('does not create empty destination-safety cards for guides without reminders', async () => {
    const { vm } = createVm({
      savedMeta: [{ packId: 'samal' }],
      savedPack: {
        destination: { id: 'samal', name: 'Samal Island' },
        safety: { reminders: [], emergencyContacts: [] },
      },
    });

    await vm.load();

    expect(vm.state.destinations).toEqual([]);
  });
});
