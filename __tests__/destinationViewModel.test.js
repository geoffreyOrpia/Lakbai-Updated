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
