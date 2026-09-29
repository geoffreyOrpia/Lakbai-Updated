import { NearbyViewModel } from '../src/presentation/viewmodels/NearbyViewModel.jsx';

const createVm = ({ permission = false } = {}) => {
  let discoveryState = { recents: [], pins: [] };
  const destinationDeps = {
    packRepository: {
      listSavedMeta: jest.fn().mockResolvedValue([]),
      listManifests: jest.fn().mockResolvedValue([{ id: 'samal' }]),
      getBundledPack: jest.fn().mockResolvedValue({
        id: 'samal',
        destination: {
          id: 'samal',
          name: 'Samal Island',
          aliases: ['IGaCoS'],
          municipality: 'Samal',
          province: 'Davao del Norte',
          category: 'island',
        },
        spots: [{
          id: 'port',
          name: 'Port of Babak',
          lat: 7.1336,
          lng: 125.6847,
          category: 'transport',
        }],
      }),
      getOfflineBasemapStatus: jest.fn().mockResolvedValue({
        uri: 'file:///maps/davao-del-norte.pmtiles',
      }),
    },
    discoveryRepository: {
      getState: jest.fn(async () => discoveryState),
      saveState: jest.fn(async next => { discoveryState = next; }),
    },
  };
  const locationService = {
    requestPermissions: jest.fn().mockResolvedValue(permission),
    getCurrentFix: jest.fn().mockResolvedValue({
      lat: 7.13,
      lng: 125.68,
      accuracy: 8,
    }),
  };
  const nav = {
    onOpenDestination: jest.fn(),
    onOpenNavigation: jest.fn(),
    onOpenLibrary: jest.fn(),
    onBack: jest.fn(),
  };
  return {
    vm: new NearbyViewModel(destinationDeps, locationService, nav),
    nav,
    readState: () => discoveryState,
  };
};

describe('NearbyViewModel offline discovery', () => {
  test('refreshes saved guides after a detour without resetting the search or asking for location again', async () => {
    const { vm } = createVm();
    await vm.load();
    vm.setQuery('Babak');
    vm.destinationDeps.packRepository.listSavedMeta.mockResolvedValue([{ packId: 'samal' }]);
    vm.locationService.requestPermissions.mockClear();
    await vm.refreshSavedPlaces();
    expect(vm.state).toMatchObject({ query: 'Babak', savedPackCount: 1, loading: false });
    expect(vm.locationService.requestPermissions).not.toHaveBeenCalled();
  });
  test('loads offline search even when foreground location is denied', async () => {
    const { vm } = createVm({ permission: false });

    await vm.load();
    vm.setQuery('igacos');

    expect(vm.state.permission).toBe('denied');
    expect(vm.state.basemapUri).toBe('file:///maps/davao-del-norte.pmtiles');
    expect(vm.searchResults[0]).toEqual(expect.objectContaining({
      kind: 'destination',
      destinationId: 'samal',
    }));
  });

  test('shows bundled tourism places even when no guides have been saved', async () => {
    const { vm } = createVm({ permission: true });

    await vm.load();

    expect(vm.state.savedPackCount).toBe(0);
    expect(vm.tourismPlaces).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Samal Island' }),
      expect.objectContaining({ name: 'Port of Babak' }),
    ]));
    expect(vm.tourismPlaceCount).toBe(2);
  });

  test('progressively reveals large tourism catalogs instead of rendering everything at once', () => {
    const { vm } = createVm();
    vm.setState({
      catalog: {
        places: Array.from({ length: 23 }, (_, index) => ({
          id: `place:${index}`,
          kind: 'place',
          name: `Tourism place ${String(index).padStart(2, '0')}`,
          lat: 7.2 + index / 1000,
          lng: 125.7,
        })),
        streets: [],
      },
    });

    expect(vm.tourismPlaces).toHaveLength(10);
    expect(vm.hasMoreTourismPlaces).toBe(true);
    vm.loadMoreTourismPlaces();
    expect(vm.tourismPlaces).toHaveLength(20);
    vm.loadMoreTourismPlaces();
    expect(vm.tourismPlaces).toHaveLength(23);
    expect(vm.hasMoreTourismPlaces).toBe(false);
  });

  test('routes a Samal street result through the Samal offline region', async () => {
    const { vm, nav } = createVm();
    await vm.load();
    vm.setQuery('babak penaplata road');
    const street = vm.searchResults.find(entry => entry.kind === 'street');

    expect(street).toBeTruthy();
    expect(vm.navigateToEntry(street)).toBe(true);
    expect(nav.onOpenNavigation).toHaveBeenCalledWith(expect.objectContaining({
      destinationId: 'samal',
      discoveryTarget: true,
      coordinateStatus: 'osm-road-reference',
    }));
  });

  test('rejects dropped pins outside the Davao del Norte boundary', async () => {
    const { vm, nav, readState } = createVm();
    await vm.load();

    const result = await vm.dropPin({ lat: 7.0807, lng: 125.608 });

    expect(result.ok).toBe(false);
    expect(readState().pins).toEqual([]);
    expect(nav.onOpenNavigation).not.toHaveBeenCalled();
  });

  test('saves and routes a dropped pin without marking it as a verified entrance', async () => {
    const { vm, nav, readState } = createVm();
    await vm.load();
    const result = await vm.dropPin({ lat: 7.44, lng: 125.8 });

    expect(result.ok).toBe(true);
    expect(readState().pins).toHaveLength(1);
    expect(readState().pins[0].coordinateStatus).toBe('user-pin');

    vm.navigateToEntry(result.pin);
    expect(nav.onOpenNavigation).toHaveBeenCalledWith(expect.objectContaining({
      destinationId: 'tagum',
      coordinateStatus: 'user-pin',
    }));
  });
});
