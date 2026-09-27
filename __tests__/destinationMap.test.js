import {
  createDestinationMapData,
  destinationMapBounds,
} from '../src/core/maps/destinationMapData.jsx';

describe('destination planning map data', () => {
  test('builds GeoJSON points only from coordinate-based local places', () => {
    const geojson = createDestinationMapData({
      spots: [
        { id: 'a', name: 'A', category: 'park', lat: 7.1, lng: 125.6 },
        { id: 'b', name: 'B' },
      ],
    });

    expect(geojson).toEqual({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        id: 'a',
        properties: {
          id: 'a',
          name: 'A',
          category: 'park',
        },
        geometry: {
          type: 'Point',
          coordinates: [125.6, 7.1],
        },
      }],
    });
  });

  test('calculates a usable bounding box for multiple points', () => {
    const bounds = destinationMapBounds({
      features: [
        { geometry: { coordinates: [125.6, 7.1] } },
        { geometry: { coordinates: [125.8, 7.4] } },
      ],
    });

    expect(bounds).toEqual([125.6, 7.1, 125.8, 7.4]);
  });

  test('pads a single coordinate into non-zero bounds', () => {
    const [west, south, east, north] = destinationMapBounds({
      features: [{ geometry: { coordinates: [125.6, 7.1] } }],
    });

    expect(east).toBeGreaterThan(west);
    expect(north).toBeGreaterThan(south);
  });
});
