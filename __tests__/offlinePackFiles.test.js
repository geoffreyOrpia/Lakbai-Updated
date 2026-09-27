import { buildOfflinePackFiles } from '../src/core/offline/offlinePackFiles.jsx';

const pack = {
  id: 'tagum',
  version: 4,
  updatedAt: '2026-09-27T08:00:00.000Z',
  destination: {
    name: 'Tagum City',
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
      'manifest.json',
      'pack.json',
      'photos.json',
      'places.geojson',
      'routes.json',
    ]);
    expect(JSON.parse(files['places.geojson']).features[0].geometry.coordinates).toEqual([125.8071, 7.4477]);
    expect(JSON.parse(files['routes.json'])).toEqual(pack.routeSuggestions);
    expect(JSON.parse(files['photos.json'])).toEqual(pack.destination.photos);
  });

  test('records bundled images separately from saved file data', () => {
    const manifest = JSON.parse(buildOfflinePackFiles(pack, 12345, ['images/tagum-cathedral.jpg'])['manifest.json']);

    expect(manifest).toEqual(expect.objectContaining({
      packId: 'tagum',
      version: 4,
      savedAt: 12345,
      imageStorage: 'saved-pack-files',
      photoKeys: ['tagum-cathedral'],
      photoFiles: ['images/tagum-cathedral.jpg'],
    }));
  });
});
