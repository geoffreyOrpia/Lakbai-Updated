import { NavigationViewModel } from '../src/presentation/viewmodels/NavigationViewModel.jsx';

const graph = {
  meta: {
    id: 'panabo-routing-pilot',
    bounds: [125.65, 7.245, 125.705, 7.325],
  },
  nodes: [
    { id: 'a', lat: 7.3, lng: 125.68 },
    { id: 'b', lat: 7.285, lng: 125.6805 },
    { id: 'c', lat: 7.272383, lng: 125.680829 },
  ],
  edges: [
    { from: 'a', to: 'b', distanceKm: 1.7, walk: true, drive: true, highway: 'primary' },
    { from: 'b', to: 'a', distanceKm: 1.7, walk: true, drive: true, highway: 'primary' },
    { from: 'b', to: 'c', distanceKm: 1.4, walk: true, drive: true, highway: 'residential' },
    { from: 'c', to: 'b', distanceKm: 1.4, walk: true, drive: true, highway: 'residential' },
  ],
};

const createVm = ({
  fix = { lat: 7.2999, lng: 125.6801, accuracy: 8 },
  graphValue = graph,
  basemapUri = 'file:///maps/davao-del-norte.pmtiles',
} = {}) => {
  const routingDeps = {
    routingGraphRepository: {
      getForDestination: jest.fn().mockResolvedValue(graphValue),
    },
  };
  const destinationDeps = {
    packRepository: {
      getOfflineBundleStatus: jest.fn().mockResolvedValue(
        basemapUri ? { basemapUri } : null,
      ),
    },
  };
  const locationService = {
    requestPermissions: jest.fn().mockResolvedValue(true),
    getCurrentFix: jest.fn().mockResolvedValue(fix),
  };
  const nav = { onBack: jest.fn() };
  const route = {
    destinationId: 'panabo',
    destinationName: 'Panabo City',
    target: { label: 'Panabo Mangrove Park', lat: 7.272383, lng: 125.680829 },
    mode: 'walk',
  };
  return {
    vm: new NavigationViewModel(routingDeps, destinationDeps, locationService, route, nav),
    routingDeps,
    destinationDeps,
    locationService,
    nav,
  };
};

describe('NavigationViewModel', () => {
  test('loads the bundled graph and saved offline basemap', async () => {
    const { vm } = createVm();

    await vm.load();

    expect(vm.state.graph).toBe(graph);
    expect(vm.state.graphMeta.id).toBe('panabo-routing-pilot');
    expect(vm.state.offlineBasemapUri).toBe('file:///maps/davao-del-norte.pmtiles');
    expect(vm.state.error).toBeNull();
  });

  test('calculates an offline route from the foreground GPS fix', async () => {
    const { vm, locationService } = createVm();
    await vm.load();

    await vm.startFromGps();

    expect(locationService.requestPermissions).toHaveBeenCalledTimes(1);
    expect(locationService.getCurrentFix).toHaveBeenCalledTimes(1);
    expect(vm.state.route?.ok).toBe(true);
    expect(vm.state.route.distanceKm).toBeCloseTo(3.1, 5);
    expect(vm.state.preview).toBe(false);
  });

  test('rejects GPS positions outside the current pilot coverage', async () => {
    const { vm } = createVm({
      fix: { lat: 8.0, lng: 126.0, accuracy: 7 },
    });
    await vm.load();

    await vm.startFromGps();

    expect(vm.state.route).toBeNull();
    expect(vm.state.error).toContain('outside the current Panabo offline-routing pilot');
  });

  test('requires saved map files before enabling offline navigation', async () => {
    const { vm } = createVm({ basemapUri: null });

    await vm.load();

    expect(vm.state.error).toContain('Save or update this destination pack');
    expect(vm.state.offlineBasemapUri).toBeNull();
  });
});
