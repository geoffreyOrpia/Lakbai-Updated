import { TrailViewModel } from '../src/presentation/viewmodels/TrailViewModel.jsx';

const trail = {
  id: 'panabo-mangrove-boardwalk',
  name: 'Panabo Mangrove Boardwalk — mapped segment',
  durationMin: 12,
  geometry: {
    type: 'LineString',
    coordinates: [
      [125.6808807, 7.2723324],
      [125.681503, 7.2719787],
      [125.6816693, 7.2717925],
      [125.6810269, 7.2710674],
    ],
  },
  waypoints: [
    {
      id: 'start',
      name: 'Mapped segment start',
      type: 'start',
      lng: 125.6808807,
      lat: 7.2723324,
    },
    {
      id: 'end',
      name: 'Mapped segment end',
      type: 'end',
      lng: 125.6810269,
      lat: 7.2710674,
    },
  ],
};

const createVm = ({
  currentFix = null,
  offlineBundle = { basemapUri: 'file:///maps/davao-del-norte.pmtiles' },
} = {}) => {
  const deps = {
    packRepository: {
      getSavedPack: jest.fn().mockResolvedValue({
        destination: { name: 'Panabo City' },
        trails: [trail],
      }),
      getOfflineBundleStatus: jest.fn().mockResolvedValue(offlineBundle),
    },
  };
  const location = {
    requestPermissions: jest.fn().mockResolvedValue(true),
    getCurrentFix: jest.fn().mockResolvedValue(currentFix),
    watchFix: jest.fn().mockResolvedValue(jest.fn()),
  };
  const nav = { onBack: jest.fn() };
  return {
    vm: new TrailViewModel(deps, location, 'panabo', trail.id, nav),
    deps,
    location,
    nav,
  };
};

describe('TrailViewModel', () => {
  test('loads only a saved verified trail and its local basemap', async () => {
    const { vm, deps } = createVm();

    await vm.load();

    expect(deps.packRepository.getSavedPack).toHaveBeenCalledWith('panabo');
    expect(vm.state.trail).toBe(trail);
    expect(vm.state.offlineBasemapUri).toBe('file:///maps/davao-del-norte.pmtiles');
    expect(vm.state.routeDistanceKm).toBeGreaterThan(0.2);
    expect(vm.state.routeDistanceKm).toBeLessThan(0.23);
    expect(vm.state.remainingKm).toBeCloseTo(vm.state.routeDistanceKm, 5);
  });

  test('projects a reliable GPS fix onto the trail and exposes the next waypoint', async () => {
    const { vm } = createVm();
    await vm.load();

    vm.applyFix({
      lat: 7.2719787,
      lng: 125.681503,
      accuracy: 6,
      heading: 145,
    });

    expect(vm.state.progressPct).toBeGreaterThan(20);
    expect(vm.state.progressPct).toBeLessThan(80);
    expect(vm.state.traveledKm).toBeGreaterThan(0);
    expect(vm.state.remainingKm).toBeGreaterThan(0);
    expect(vm.state.nextWaypoint?.id).toBe('end');
    expect(vm.state.distanceToNextWaypointKm).toBeGreaterThan(0);
    expect(vm.state.estimatedRemainingMin).toBeGreaterThan(0);
    expect(vm.lowAccuracy).toBe(false);
  });

  test('pauses progress calculations when GPS accuracy is poor', async () => {
    const { vm } = createVm();
    await vm.load();

    vm.applyFix({
      lat: 7.2719787,
      lng: 125.681503,
      accuracy: 120,
    });

    expect(vm.state.accuracyM).toBe(120);
    expect(vm.state.progressPct).toBe(0);
    expect(vm.state.offTrailM).toBeNull();
    expect(vm.lowAccuracy).toBe(true);
  });

  test('flags a reliable fix that is meaningfully off the verified route', async () => {
    const { vm } = createVm();
    await vm.load();

    vm.applyFix({
      lat: 7.2735,
      lng: 125.6815,
      accuracy: 5,
    });

    expect(vm.state.offTrailM).toBeGreaterThan(vm.offTrailThresholdM);
    expect(vm.offTrail).toBe(true);
  });
});
