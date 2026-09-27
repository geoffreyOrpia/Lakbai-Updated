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
    { from: 'a', to: 'b', distanceKm: 1.7, walk: true, drive: true, highway: 'primary', name: 'Panabo Road' },
    { from: 'b', to: 'a', distanceKm: 1.7, walk: true, drive: true, highway: 'primary', name: 'Panabo Road' },
    { from: 'b', to: 'c', distanceKm: 1.4, walk: true, drive: true, highway: 'residential', name: 'J.P. Laurel Road' },
    { from: 'c', to: 'b', distanceKm: 1.4, walk: true, drive: true, highway: 'residential', name: 'J.P. Laurel Road' },
  ],
};

const verifiedTrail = {
  id: 'panabo-mangrove-boardwalk',
  name: 'Panabo Mangrove Boardwalk — mapped segment',
  routeVerified: true,
  distanceKm: 0.214,
  durationMin: 12,
  geometry: {
    type: 'LineString',
    coordinates: [
      [125.6808807, 7.2723324],
      [125.6810269, 7.2710674],
    ],
  },
};

const offlineSpots = [
  {
    id: 'spot-city-park',
    name: 'Panabo City Park',
    category: 'park',
    lat: 7.285,
    lng: 125.6805,
    tip: 'A useful meeting point.',
  },
  {
    id: 'spot-destination',
    name: 'Panabo Mangrove Park',
    category: 'park',
    lat: 7.272383,
    lng: 125.680829,
  },
];

const createVm = ({
  fix = { lat: 7.2999, lng: 125.6801, accuracy: 8 },
  graphValue = graph,
  basemapUri = 'file:///maps/davao-del-norte.pmtiles',
  routingGraphUri = 'file:///packs/panabo/routing.graph.json',
} = {}) => {
  const routingDeps = {
    routingGraphRepository: {
      getForDestination: jest.fn().mockResolvedValue(graphValue),
    },
    speechService: {
      speak: jest.fn().mockResolvedValue(true),
      stop: jest.fn().mockResolvedValue(),
    },
  };
  const destinationDeps = {
    packRepository: {
      getOfflineBundleStatus: jest.fn().mockResolvedValue(
        basemapUri ? { basemapUri, routingGraphUri } : null,
      ),
      getSavedPack: jest.fn().mockResolvedValue({
        trails: [verifiedTrail],
        spots: offlineSpots,
      }),
    },
  };
  let watchCallback = null;
  let watchError = null;
  const removeWatch = jest.fn();
  const locationService = {
    requestPermissions: jest.fn().mockResolvedValue(true),
    getCurrentFix: jest.fn().mockResolvedValue(fix),
    watchFix: jest.fn().mockImplementation(async (onFix, onError) => {
      watchCallback = onFix;
      watchError = onError;
      return removeWatch;
    }),
  };
  const nav = {
    onBack: jest.fn(),
    onOpenTrail: jest.fn(),
  };
  const route = {
    destinationId: 'panabo',
    destinationName: 'Panabo City',
    target: { label: 'Panabo Mangrove Park', lat: 7.272383, lng: 125.680829 },
    trailId: 'panabo-mangrove-boardwalk',
    mode: 'walk',
    coverage: 'Central/coastal Panabo pilot',
    previewStart: { lat: 7.2999, lng: 125.6807 },
  };
  return {
    vm: new NavigationViewModel(routingDeps, destinationDeps, locationService, route, nav),
    routingDeps,
    speechService: routingDeps.speechService,
    destinationDeps,
    locationService,
    nav,
    removeWatch,
    emitFix: next => watchCallback?.(next),
    emitLocationError: message => watchError?.(message),
  };
};

describe('NavigationViewModel', () => {
  test('loads the bundled graph and saved offline basemap', async () => {
    const { vm, routingDeps } = createVm();

    await vm.load();

    expect(vm.state.graph).toBe(graph);
    expect(vm.state.graphMeta.id).toBe('panabo-routing-pilot');
    expect(vm.state.offlineBasemapUri).toBe('file:///maps/davao-del-norte.pmtiles');
    expect(vm.state.trailPreview).toBe(verifiedTrail);
    expect(vm.state.offlinePois).toHaveLength(1);
    expect(vm.state.error).toBeNull();
    expect(routingDeps.routingGraphRepository.getForDestination).toHaveBeenCalledWith(
      'panabo',
      'file:///packs/panabo/routing.graph.json',
    );
  });

  test('calculates an offline route from the foreground GPS fix', async () => {
    const { vm, locationService } = createVm();
    await vm.load();

    await vm.startFromGps();

    expect(locationService.requestPermissions).toHaveBeenCalledTimes(1);
    expect(locationService.getCurrentFix).toHaveBeenCalledTimes(1);
    expect(vm.state.route?.ok).toBe(true);
    expect(vm.state.route.distanceKm).toBeGreaterThan(3);
    expect(vm.state.route.distanceKm).toBeLessThan(3.1);
    expect(vm.state.route.maneuvers.at(-1).instruction).toBe('Arrive at Panabo Mangrove Park');
    expect(vm.state.routePois[0]).toEqual(expect.objectContaining({
      id: 'spot-city-park',
    }));
    expect(vm.state.preview).toBe(false);
  });

  test('keeps the selected exploration preference in route calculation', async () => {
    const { vm } = createVm();
    await vm.load();

    vm.setPreference('adventure');
    await vm.startFromGps();

    expect(vm.state.preference).toBe('adventure');
    expect(vm.state.route.preference).toBe('adventure');
  });

  test('starts foreground GPS tracking and updates route progress', async () => {
    const setup = createVm();
    const { vm, locationService, emitFix } = setup;
    await vm.load();
    await vm.startFromGps();

    await vm.startNavigation();
    expect(vm.state.tracking).toBe(true);
    expect(locationService.watchFix).toHaveBeenCalledTimes(1);

    emitFix({ lat: 7.285, lng: 125.6805, accuracy: 6 });

    expect(vm.state.progressPct).toBeGreaterThan(40);
    expect(vm.state.remainingKm).toBeLessThan(vm.state.route.distanceKm);
    expect(vm.state.nextManeuver).toBeTruthy();
    expect(vm.state.gpsError).toBeNull();
  });

  test('speaks staged maneuver guidance without repeating every GPS fix', async () => {
    const { vm, speechService, emitFix } = createVm();
    await vm.load();
    await vm.startFromGps();

    await vm.startNavigation();

    expect(speechService.speak).toHaveBeenCalledTimes(1);
    expect(speechService.speak.mock.calls[0][0]).toContain('In ');

    emitFix({ lat: 7.2999, lng: 125.6801, accuracy: 6 });
    emitFix({ lat: 7.2998, lng: 125.6801, accuracy: 6 });
    expect(speechService.speak).toHaveBeenCalledTimes(1);
  });

  test('can mute and restore spoken navigation guidance', async () => {
    const { vm, speechService } = createVm();
    await vm.load();
    await vm.startFromGps();
    await vm.startNavigation();
    const spokenBeforeMute = speechService.speak.mock.calls.length;

    vm.toggleVoiceGuidance();
    expect(vm.state.voiceGuidance).toBe(false);
    expect(speechService.stop).toHaveBeenCalled();
    vm.applyFix({ lat: 7.285, lng: 125.6805, accuracy: 6 });
    expect(speechService.speak).toHaveBeenCalledTimes(spokenBeforeMute);

    vm.toggleVoiceGuidance();
    expect(vm.state.voiceGuidance).toBe(true);
    expect(speechService.speak.mock.calls.length).toBeGreaterThan(spokenBeforeMute);
  });

  test('pauses navigation progress when live GPS accuracy is poor', async () => {
    const { vm } = createVm();
    await vm.load();
    await vm.startFromGps();
    const before = vm.state.progressPct;

    vm.applyFix({ lat: 7.285, lng: 125.6805, accuracy: 120 });

    expect(vm.lowAccuracy).toBe(true);
    expect(vm.state.progressPct).toBe(before);
    expect(vm.state.gpsError).toContain('paused');
  });

  test('waits for three reliable off-route fixes before rerouting', async () => {
    const { vm } = createVm();
    await vm.load();
    await vm.startFromGps();
    vm.setState({ tracking: true });
    const reroute = jest.spyOn(vm, 'rerouteFrom').mockResolvedValue();

    const offRouteFix = { lat: 7.2999, lng: 125.6815, accuracy: 5 };
    vm.applyFix(offRouteFix);
    vm.applyFix(offRouteFix);
    expect(reroute).not.toHaveBeenCalled();

    vm.applyFix(offRouteFix);
    expect(reroute).toHaveBeenCalledTimes(1);
  });

  test('marks arrival, stops tracking, and can hand off to the verified trail', async () => {
    const { vm, removeWatch, nav } = createVm();
    await vm.load();
    await vm.startFromGps();
    await vm.startNavigation();

    vm.applyFix({ lat: 7.272383, lng: 125.680829, accuracy: 5 });

    expect(vm.state.arrived).toBe(true);
    expect(vm.state.tracking).toBe(false);
    expect(removeWatch).toHaveBeenCalled();

    vm.openTrail();
    expect(nav.onOpenTrail).toHaveBeenCalledWith('panabo-mangrove-boardwalk');
  });

  test('rejects GPS positions outside the current pilot coverage', async () => {
    const { vm } = createVm({
      fix: { lat: 8.0, lng: 126.0, accuracy: 7 },
    });
    await vm.load();

    await vm.startFromGps();

    expect(vm.state.route).toBeNull();
    expect(vm.state.error).toContain('outside the current Central/coastal Panabo pilot');
  });

  test('rejects an initial GPS fix that is too inaccurate for routing', async () => {
    const { vm } = createVm({
      fix: { lat: 7.2999, lng: 125.6801, accuracy: 150 },
    });
    await vm.load();

    await vm.startFromGps();

    expect(vm.state.route).toBeNull();
    expect(vm.state.error).toContain('GPS accuracy');
  });

  test('requires saved map files before enabling offline navigation', async () => {
    const { vm } = createVm({ basemapUri: null });

    await vm.load();

    expect(vm.state.error).toContain('Save or update this destination pack');
    expect(vm.state.offlineBasemapUri).toBeNull();
  });

  test('previews from destination-provided routing coverage coordinates', async () => {
    const { vm } = createVm();
    await vm.load();

    vm.previewRoute();

    expect(vm.state.preview).toBe(true);
    expect(vm.state.fix).toEqual({ lat: 7.2999, lng: 125.6807 });
    expect(vm.state.route?.ok).toBe(true);
  });
});
