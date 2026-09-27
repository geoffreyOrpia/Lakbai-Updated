import { buildOfflinePackFiles } from '../src/core/offline/offlinePackFiles.jsx';

const pack = {
  id: 'tagum',
  version: 4,
  updatedAt: '2026-09-27T08:00:00.000Z',
  destination: {
    name: 'Tagum City',
    municipality: 'Tagum',
    photos: [{
      key: 'tagum-cathedral',
      credit: 'Example',
    }],
  },
  spots: [{
    id: 'cathedral',
    name: 'Cathedral',
    category: 'landmark',
    lat: 7.4477,
    lng: 125.8071,
  }],
  routeSuggestions: [{
    id: 'heritage',
    name: 'Heritage Walk',
    planningOnly: true,
    stops: [{ id: 's1', name: 'Cathedral' }],
  }],
  trails: [],
};

describe('offline pack file serialization', () => {
  test('creates durable guide, map, route, photo, and manifest documents', () => {
    const files = buildOfflinePackFiles(pack, 12345, ['images/tagum-cathedral.jpg']);

    expect(Object.keys(files).sort()).toEqual([
      'context.geojson',
      'manifest.json',
      'pack.json',
      'photos.json',
      'places.geojson',
      'routes.json',
    ]);
    expect(JSON.parse(files['places.geojson']).features[0].geometry.coordinates).toEqual([125.8071, 7.4477]);
    const context = JSON.parse(files['context.geojson']);
    expect(context.type).toBe('FeatureCollection');
    expect(context.features).toHaveLength(1);
    expect(context.features[0].properties.adm3_en).toBe('City of Tagum');
    expect(JSON.parse(files['routes.json'])).toEqual(pack.routeSuggestions);
    expect(JSON.parse(files['photos.json'])).toEqual(pack.destination.photos);
  });

  test('records bundled images separately from saved file data', () => {
    const manifest = JSON.parse(buildOfflinePackFiles(pack, 12345, ['images/tagum-cathedral.jpg'])['manifest.json']);

    expect(manifest).toEqual(expect.objectContaining({
      packId: 'tagum',
      version: 4,
      savedAt: 12345,
      format: 3,
      files: expect.objectContaining({
        map: 'places.geojson',
        contextMap: 'context.geojson',
      }),
      mapContext: expect.objectContaining({
        license: 'MIT',
      }),
      imageStorage: 'saved-pack-files',
      photoKeys: ['tagum-cathedral'],
      photoFiles: ['images/tagum-cathedral.jpg'],
    }));
  });

  test('adds an optional routing graph as a first-class pack file', () => {
    const routingGraph = {
      meta: { id: 'tagum-routing' },
      nodes: [
        { id: 'a', lat: 7.4, lng: 125.8 },
        { id: 'b', lat: 7.41, lng: 125.81 },
      ],
      edges: [
        { from: 'a', to: 'b', distanceKm: 1, walk: true },
      ],
    };
    const files = buildOfflinePackFiles(
      pack,
      12345,
      ['images/tagum-cathedral.jpg'],
      routingGraph,
    );
    const manifest = JSON.parse(files['manifest.json']);

    expect(manifest.files.routingGraph).toBe('routing.graph.json');
    expect(JSON.parse(files['routing.graph.json'])).toEqual(routingGraph);
  });
});
