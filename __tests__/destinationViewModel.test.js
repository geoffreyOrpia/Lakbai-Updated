import { DestinationViewModel } from '../src/presentation/viewmodels/DestinationViewModel.jsx';

const createVm = () => {
  const nav = {
    onOpenNavigation: jest.fn(),
    onOpenTrail: jest.fn(),
    onPlanRoute: jest.fn(),
    onBack: jest.fn(),
  };
  const vm = new DestinationViewModel({}, 'panabo', nav, {});
  vm.setState({
    pack: {
      destination: {
        id: 'panabo',
        name: 'Panabo City',
        offlineNavigation: {
          mode: 'walk',
          coverage: 'Central/coastal Panabo pilot',
          previewStart: { lat: 7.2999, lng: 125.6807 },
          target: {
            label: 'Panabo Mangrove Park',
            lat: 7.272383,
            lng: 125.680829,
          },
        },
      },
      trails: [{
        id: 'panabo-mangrove-boardwalk',
        routeVerified: true,
      }],
    },
  });
  return { vm, nav };
};

describe('DestinationViewModel offline navigation targets', () => {
  test('saves an unsaved place before opening directions to the requested spot', async () => {
    const { vm, nav } = createVm();
    let finishSave;
    vm.saveToLibrary = jest.fn(() => new Promise(resolve => { finishSave = resolve; }));
    const place = { name: 'Market', lat: 7.3, lng: 125.67 };
    const pending = vm.prepareAndOpen({ place });
    expect(nav.onOpenNavigation).not.toHaveBeenCalled();
    finishSave({ ok: true });
    await expect(pending).resolves.toEqual({ ok: true });
    expect(nav.onOpenNavigation).toHaveBeenCalledWith(expect.objectContaining({ target: { label: 'Market', lat: 7.3, lng: 125.67 } }));
  });

  test('keeps the user on the guide when saving fails', async () => {
    const { vm, nav } = createVm();
    vm.saveToLibrary = jest.fn().mockResolvedValue({ ok: false, message: 'Not enough storage.' });
    await expect(vm.prepareAndOpen()).resolves.toEqual({ ok: false, message: 'Not enough storage.' });
    expect(nav.onOpenNavigation).not.toHaveBeenCalled();
    expect(nav.onOpenTrail).not.toHaveBeenCalled();
  });

  test('opens a saved trail without saving it again and ignores taps while busy', async () => {
    const { vm, nav } = createVm();
    vm.saveToLibrary = jest.fn();
    vm.setState({ saved: true });
    await vm.prepareAndOpen({ trailId: 'boardwalk' });
    expect(nav.onOpenTrail).toHaveBeenCalledWith('boardwalk');
    expect(vm.saveToLibrary).not.toHaveBeenCalled();
    vm.setState({ busy: true });
    await vm.prepareAndOpen();
    expect(nav.onOpenNavigation).not.toHaveBeenCalled();
  });

  test('opens the default destination target with verified trail handoff', () => {
    const { vm, nav } = createVm();

    vm.openOfflineNavigation();

    expect(nav.onOpenNavigation).toHaveBeenCalledWith(expect.objectContaining({
      destinationId: 'panabo',
      target: expect.objectContaining({
        label: 'Panabo Mangrove Park',
      }),
      trailId: 'panabo-mangrove-boardwalk',
    }));
  });

  test('opens a curated spot as its own offline routing target', () => {
    const { vm, nav } = createVm();

    vm.openOfflineNavigation({
      id: 'spot-pan-market',
      name: 'Panabo Public Market',
      lat: 7.3048,
      lng: 125.6789,
    });

    expect(nav.onOpenNavigation).toHaveBeenCalledWith(expect.objectContaining({
      destinationId: 'panabo',
      target: {
        label: 'Panabo Public Market',
        lat: 7.3048,
        lng: 125.6789,
      },
      trailId: null,
    }));
  });

  test('keeps verified trail handoff when the selected spot is the trail entrance', () => {
    const { vm, nav } = createVm();

    vm.openOfflineNavigation({
      id: 'spot-pan-entrance',
      name: 'Panabo Mangrove Park',
      lat: 7.272383,
      lng: 125.680829,
    });

    expect(nav.onOpenNavigation).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.objectContaining({
        label: 'Panabo Mangrove Park',
      }),
      trailId: 'panabo-mangrove-boardwalk',
    }));
  });
});
