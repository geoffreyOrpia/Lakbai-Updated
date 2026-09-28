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

const restrictedRerouteGraph = {
  meta: { id: 'restricted-reroute-fixture' },
  nodes: [
    { id: 'a', lat: 7, lng: 125 },
    { id: 'v', lat: 7, lng: 125.01 },
    { id: 'x', lat: 7, lng: 125.013 },
    { id: 'y', lat: 7, lng: 125.016 },
    { id: 'b', lat: 7, lng: 125.02 },
    { id: 'c', lat: 7.01, lng: 125.02 },
    { id: 'd', lat: 7.01, lng: 125.03 },
  ],
  edges: [
    ['a','v','in'], ['v','x','via1'], ['x','y','via1'], ['y','b','via2'],
    ['b','d','out'], ['b','c','escape'], ['c','d','detour'],
  ].map(([from,to,osmId], index) => {
    const fromNode = {
      a:[125,7], v:[125.01,7], x:[125.013,7], y:[125.016,7],
      b:[125.02,7], c:[125.02,7.01], d:[125.03,7.01],
    }[from];
    const toNode = {
      a:[125,7], v:[125.01,7], x:[125.013,7], y:[125.016,7],
      b:[125.02,7], c:[125.02,7.01], d:[125.03,7.01],
    }[to];
    return {
      id: String(index), from, to, osmId, segmentId: `${osmId}:${from}:${to}`,
      distanceKm: 1, highway: 'residential', walk: true, drive: true,
      geometry: { type: 'LineString', coordinates: [fromNode, toNode] },
    };
  }),
  turnRestrictions: [{
    id: 'multi-way-rule',
    tags: { type: 'restriction', restriction: 'no_left_turn' },
    members: [
      { type: 'w', ref: 'in', role: 'from' },
      { type: 'w', ref: 'via1', role: 'via' },
      { type: 'w', ref: 'via2', role: 'via' },
      { type: 'w', ref: 'out', role: 'to' },
    ],
  }],
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

const createRestrictedVm = () => {
  const routingDeps = {
    routingGraphRepository: {
      getForDestination: jest.fn().mockResolvedValue(restrictedRerouteGraph),
    },
    speechService: {
      speak: jest.fn().mockResolvedValue(true),
      stop: jest.fn().mockResolvedValue(),
    },
  };
  const destinationDeps = {
    packRepository: {
      getOfflineBundleStatus: jest.fn().mockResolvedValue({
        basemapUri: 'file:///maps/restricted.pmtiles',
        routingGraphUri: 'file:///packs/restricted/routing.graph.json',
      }),
      getSavedPack: jest.fn().mockResolvedValue({ trails: [], spots: [] }),
    },
  };
  const locationService = {
    requestPermissions: jest.fn().mockResolvedValue(true),
    getCurrentFix: jest.fn().mockResolvedValue({ lat: 7, lng: 125, accuracy: 5, timestamp: 1_000 }),
    watchFix: jest.fn().mockResolvedValue(jest.fn()),
  };
  return new NavigationViewModel(
    routingDeps,
    destinationDeps,
    locationService,
    {
      destinationId: 'restricted',
      destinationName: 'Restricted fixture',
      target: { label: 'Target', lat: 7.01, lng: 125.03 },
      mode: 'drive',
    },
    { onBack: jest.fn(), onOpenTrail: jest.fn() },
  );
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
    expect(vm.state.scenicPois).toHaveLength(1);
    expect(vm.state.error).toBeNull();
    expect(routingDeps.routingGraphRepository.getForDestination).toHaveBeenCalledWith(
      'panabo',
      'file:///packs/panabo/routing.graph.json',
      vm.state.target,
      null,
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

  test('can calculate a driving route and resets walking preferences', async () => {
    const { vm } = createVm();
    await vm.load();

    vm.setPreference('adventure');
    vm.setMode('drive');
    await vm.startFromGps();

    expect(vm.state.mode).toBe('drive');
    expect(vm.state.preference).toBe('direct');
    expect(vm.state.route.mode).toBe('drive');
    expect(vm.state.route.preference).toBe('direct');
    expect(vm.state.route.durationMin).toBeLessThan(10);
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

  test('uses a smoothed GPS pace for live ETA when speed is reliable', async () => {
    const { vm, emitFix } = createVm();
    await vm.load();
    await vm.startFromGps();
    await vm.startNavigation();

    emitFix({ lat: 7.285, lng: 125.6805, accuracy: 6, speed: 1.8 });

    expect(vm.state.usingLiveEta).toBe(true);
    expect(vm.state.remainingMin).toBeGreaterThan(0);

    emitFix({ lat: 7.2849, lng: 125.6805, accuracy: 6, speed: 0.1 });
    expect(vm.state.usingLiveEta).toBe(false);
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

  test('confirms a missed-turn trace before rerouting', async () => {
    const { vm } = createVm({
      fix: { lat: 7.2999, lng: 125.6801, accuracy: 5, timestamp: 1_000 },
    });
    await vm.load();
    await vm.startFromGps();
    vm.setState({ tracking: true });
    const reroute = jest.spyOn(vm, 'rerouteFrom').mockResolvedValue();

    const missedTurnTrace = [
      { lat: 7.2999, lng: 125.6815, accuracy: 5, timestamp: 3_000 },
      { lat: 7.2998, lng: 125.6815, accuracy: 5, timestamp: 5_000 },
      { lat: 7.2997, lng: 125.6815, accuracy: 5, timestamp: 7_000 },
    ];
    missedTurnTrace.slice(0, 2).forEach(fix => vm.applyFix(fix));
    expect(reroute).not.toHaveBeenCalled();

    vm.applyFix(missedTurnTrace[2]);
    expect(reroute).toHaveBeenCalledTimes(1);
  });

  test('advances consistently on a correct deterministic GPS trace', async () => {
    const { vm, emitFix } = createVm({
      fix: { lat: 7.2999, lng: 125.6801, accuracy: 5, timestamp: 1_000 },
    });
    await vm.load();
    await vm.startFromGps();
    await vm.startNavigation();

    const progress = [];
    [
      { lat: 7.296, lng: 125.6802, accuracy: 5, speed: 1.4, heading: 0, timestamp: 3_000 },
      { lat: 7.291, lng: 125.68035, accuracy: 5, speed: 1.5, heading: 180, timestamp: 5_000 },
      { lat: 7.285, lng: 125.6805, accuracy: 5, speed: 1.5, heading: 180, timestamp: 7_000 },
    ].forEach(fix => {
      emitFix(fix);
      progress.push(vm.state.distanceAlongKm);
    });

    expect(progress[1]).toBeGreaterThan(progress[0]);
    expect(progress[2]).toBeGreaterThan(progress[1]);
    expect(vm.state.wrongWay).toBe(false);
    expect(vm.state.gpsError).toBeNull();
  });

  test('holds progress and guidance steady through stationary GPS jitter', async () => {
    const { vm, speechService, emitFix } = createVm({
      fix: { lat: 7.2999, lng: 125.6801, accuracy: 6, timestamp: 1_000 },
    });
    await vm.load();
    await vm.startFromGps();
    await vm.startNavigation();
    const before = {
      distanceAlongKm: vm.state.distanceAlongKm,
      remainingKm: vm.state.remainingKm,
      maneuverId: vm.state.nextManeuver?.id,
      spoken: speechService.speak.mock.calls.length,
    };

    [
      { lat: 7.299904, lng: 125.680103, accuracy: 6, speed: 0, timestamp: 3_000 },
      { lat: 7.299896, lng: 125.680097, accuracy: 7, speed: 0, timestamp: 5_000 },
      { lat: 7.299902, lng: 125.680099, accuracy: 6, speed: 0, timestamp: 7_000 },
    ].forEach(fix => emitFix(fix));

    expect(vm.state.distanceAlongKm).toBe(before.distanceAlongKm);
    expect(vm.state.remainingKm).toBe(before.remainingKm);
    expect(vm.state.nextManeuver?.id).toBe(before.maneuverId);
    expect(speechService.speak).toHaveBeenCalledTimes(before.spoken);
  });

  test('uses sustained reverse movement instead of one heading reading for wrong-way rerouting', async () => {
    const { vm, emitFix } = createVm({
      fix: { lat: 7.2999, lng: 125.6801, accuracy: 5, timestamp: 1_000 },
    });
    await vm.load();
    await vm.startFromGps();
    await vm.startNavigation();
    const reroute = jest.spyOn(vm, 'rerouteFrom').mockResolvedValue();

    emitFix({ lat: 7.296, lng: 125.6802, accuracy: 5, speed: 1.5, heading: 0, timestamp: 3_000 });
    expect(reroute).not.toHaveBeenCalled();

    emitFix({ lat: 7.29606, lng: 125.6802, accuracy: 5, speed: 1.4, heading: 0, timestamp: 5_000 });
    emitFix({ lat: 7.29612, lng: 125.6802, accuracy: 5, speed: 1.4, heading: 0, timestamp: 7_000 });
    expect(reroute).not.toHaveBeenCalled();
    emitFix({ lat: 7.29618, lng: 125.6802, accuracy: 5, speed: 1.4, heading: 0, timestamp: 9_000 });

    expect(reroute).toHaveBeenCalledTimes(1);
  });

  test('rejects stale and out-of-order fixes without rewinding navigation state', async () => {
    const { vm, speechService, emitFix } = createVm({
      fix: { lat: 7.2999, lng: 125.6801, accuracy: 5, timestamp: 1_000 },
    });
    await vm.load();
    await vm.startFromGps();
    await vm.startNavigation();

    emitFix({ lat: 7.291, lng: 125.68035, accuracy: 5, speed: 1.5, timestamp: 5_000 });
    const before = {
      fix: vm.state.fix,
      distanceAlongKm: vm.state.distanceAlongKm,
      remainingKm: vm.state.remainingKm,
      spoken: speechService.speak.mock.calls.length,
    };

    emitFix({ lat: 7.2725, lng: 125.6808, accuracy: 4, speed: 1.5, timestamp: 4_000 });

    expect(vm.state.fix).toBe(before.fix);
    expect(vm.state.distanceAlongKm).toBe(before.distanceAlongKm);
    expect(vm.state.remainingKm).toBe(before.remainingKm);
    expect(speechService.speak).toHaveBeenCalledTimes(before.spoken);
  });

  test('pauses for poor accuracy and resumes cleanly after GPS loss', async () => {
    const { vm, emitFix, emitLocationError } = createVm({
      fix: { lat: 7.2999, lng: 125.6801, accuracy: 5, timestamp: 1_000 },
    });
    await vm.load();
    await vm.startFromGps();
    await vm.startNavigation();

    emitFix({ lat: 7.296, lng: 125.6802, accuracy: 5, speed: 1.4, timestamp: 3_000 });
    const beforePoorFix = vm.state.distanceAlongKm;
    emitFix({ lat: 7.285, lng: 125.6805, accuracy: 140, speed: 1.4, timestamp: 5_000 });
    expect(vm.state.distanceAlongKm).toBe(beforePoorFix);
    expect(vm.state.gpsError).toContain('paused');

    emitLocationError('GPS signal unavailable');
    expect(vm.state.gpsError).toBe('GPS signal unavailable');
    emitFix({ lat: 7.291, lng: 125.68035, accuracy: 6, speed: 1.4, timestamp: 9_000 });

    expect(vm.state.distanceAlongKm).toBeGreaterThan(beforePoorFix);
    expect(vm.state.gpsError).toBeNull();
    expect(vm.state.wrongWay).toBe(false);
  });

  test('enforces a reroute cooldown after a confirmed deviation', async () => {
    const { vm } = createVm({
      fix: { lat: 7.2999, lng: 125.6801, accuracy: 5, timestamp: 1_000 },
    });
    await vm.load();
    await vm.startFromGps();
    vm.setState({ tracking: true });
    const reroute = jest.spyOn(vm, 'rerouteFrom').mockResolvedValue();

    const offRouteFix = timestamp => ({
      lat: 7.2999 - timestamp / 1_000_000,
      lng: 125.6815,
      accuracy: 5,
      timestamp,
    });
    [3_000, 5_000, 7_000].forEach(timestamp => vm.applyFix(offRouteFix(timestamp)));
    expect(reroute).toHaveBeenCalledTimes(1);

    [9_000, 11_000, 13_000].forEach(timestamp => vm.applyFix(offRouteFix(timestamp)));
    expect(reroute).toHaveBeenCalledTimes(1);

    vm.applyFix(offRouteFix(19_000));
    expect(reroute).toHaveBeenCalledTimes(2);
  });

  test('carries confirmed restriction approach history into an in-progress reroute', async () => {
    const vm = createRestrictedVm();
    await vm.load();
    await vm.startFromGps();

    expect(vm.state.route?.ok).toBe(true);
    expect(vm.state.route.edges.some(edge => edge.osmId === 'out')).toBe(false);
    vm.lastConfirmedRouteDistanceKm = vm.state.route.edges[0].distanceKm
      + vm.state.route.edges[1].distanceKm * 0.5;

    await vm.rerouteFrom({
      lat: 7,
      lng: 125.0115,
      accuracy: 5,
      timestamp: 5_000,
    });

    expect(vm.state.rerouteCount).toBe(1);
    expect(vm.state.route.initialTurnState.length).toBeGreaterThan(0);
    expect(vm.state.route.edges.some(edge => edge.osmId === 'out')).toBe(false);
    expect(vm.state.route.edges.some(edge => edge.osmId === 'escape')).toBe(true);
    expect(vm.state.route.edges.some(edge => edge.osmId === 'detour')).toBe(true);
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
