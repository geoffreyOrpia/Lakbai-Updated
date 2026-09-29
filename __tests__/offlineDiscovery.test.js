import {
  listOfflineTourismPlaces,
  loadOfflineDiscoveryCatalog,
  recordDiscoveryRecent,
  removeDroppedPin,
  saveDroppedPin,
  searchOfflineDiscovery,
} from '../src/domain/usecases/offlineDiscovery.jsx';

const pack = {
  id: 'samal',
  destination: {
    id: 'samal',
    name: 'Samal Island',
    aliases: ['IGaCoS'],
    area: 'Island Garden City of Samal',
    municipality: 'Samal',
    province: 'Davao del Norte',
    category: 'island',
  },
  spots: [{
    id: 'port',
    name: 'Port of Babak',
    aliases: ['Babak Ferry Port'],
    category: 'transport',
    lat: 7.1336,
    lng: 125.6847,
  }],
};

const createDeps = () => {
  let state = { recents: [], pins: [] };
  return {
    packRepository: {
      listManifests: jest.fn().mockResolvedValue([{ id: 'samal' }]),
      getBundledPack: jest.fn().mockResolvedValue(pack),
    },
    discoveryRepository: {
      getState: jest.fn(async () => state),
      saveState: jest.fn(async next => { state = next; }),
    },
    readState: () => state,
  };
};

describe('offline discovery', () => {
  test('searches bundled place aliases without network data', async () => {
    const deps = createDeps();
    const catalog = await loadOfflineDiscoveryCatalog(deps);

    expect(searchOfflineDiscovery(catalog, 'igacos')[0]).toEqual(expect.objectContaining({
      kind: 'destination',
      destinationId: 'samal',
    }));
    expect(searchOfflineDiscovery(catalog, 'babak ferry')[0]).toEqual(expect.objectContaining({
      kind: 'place',
      name: 'Port of Babak',
    }));
  });

  test('searches the generated provincial OSM street index including local-name aliases', async () => {
    const deps = createDeps();
    const catalog = await loadOfflineDiscoveryCatalog(deps);
    const result = searchOfflineDiscovery(catalog, 'babak penaplata road')
      .find(entry => entry.kind === 'street');

    expect(result).toEqual(expect.objectContaining({
      region: 'samal',
      municipality: 'Island Garden City of Samal',
      name: 'Babak-Samal-Kaputian Road',
      coordinateStatus: 'osm-road-reference',
    }));
  });

  test('clips the street index to all 11 Davao del Norte municipalities and cities', async () => {
    const deps = createDeps();
    const catalog = await loadOfflineDiscoveryCatalog(deps);
    const municipalities = [...new Set(catalog.streets.map(entry => entry.municipality))].sort();

    expect(municipalities).toEqual([
      'Asuncion',
      'Braulio E. Dujali',
      'Carmen',
      'City of Panabo',
      'City of Tagum',
      'Island Garden City of Samal',
      'Kapalong',
      'New Corella',
      'San Isidro',
      'Santo Tomas',
      'Talaingod',
    ]);
    expect(catalog.streets.some(entry => entry.name.includes('Iñigo'))).toBe(false);
  });

  test('ranks equal text matches by GPS distance when a fix is available', () => {
    const catalog = {
      places: [
        { id: 'near', kind: 'place', name: 'Market', lat: 7, lng: 125.01 },
        { id: 'far', kind: 'place', name: 'Market', lat: 7, lng: 125.2 },
      ],
      streets: [],
    };

    expect(searchOfflineDiscovery(catalog, 'market', {
      fix: { lat: 7, lng: 125 },
    }).map(entry => entry.id)).toEqual(['near', 'far']);
  });

  test('lists all bundled tourism entries without requiring a saved guide', async () => {
    const deps = createDeps();
    const catalog = await loadOfflineDiscoveryCatalog(deps);

    const places = listOfflineTourismPlaces(catalog, {
      fix: { lat: 7.13, lng: 125.68 },
      limit: 20,
    });

    expect(places).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Samal Island', kind: 'destination' }),
      expect.objectContaining({ name: 'Port of Babak', kind: 'place' }),
    ]));
    expect(places[0].distanceKm).toBeLessThanOrEqual(places.at(-1).distanceKm);
  });

  test('persists bounded recent targets and device-local dropped pins', async () => {
    const deps = createDeps();
    const entry = {
      id: 'place:samal:port',
      kind: 'place',
      name: 'Port of Babak',
      destinationId: 'samal',
      lat: 7.1336,
      lng: 125.6847,
      coordinateStatus: 'mapped-unverified',
    };

    await recordDiscoveryRecent(deps, entry);
    const { pin } = await saveDroppedPin(deps, { lat: 7.2, lng: 125.7 });
    expect(deps.readState().recents[0]).toEqual(expect.objectContaining({
      id: entry.id,
      name: entry.name,
    }));
    expect(deps.readState().pins[0]).toEqual(expect.objectContaining({
      id: pin.id,
      coordinateStatus: 'user-pin',
    }));

    await removeDroppedPin(deps, pin.id);
    expect(deps.readState().pins).toEqual([]);
  });
});
