import {
  createDestinationMapData,
  destinationMapBounds,
} from '../src/core/maps/destinationMapData.jsx';
import {
  createOfflineBasemapStyle,
  toPmtilesSourceUrl,
} from '../src/core/maps/offlineBasemapStyle.jsx';
import { OFFLINE_BASEMAP_META } from '../src/data/assets/offlineBasemapAsset.jsx';
import {
  createOfflineContextMapData,
  offlineContextContainsPosition,
  offlineContextMapBounds,
} from '../src/core/maps/offlineContextMapData.jsx';

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

  test('selects the destination municipality for offline regional context', () => {
    const context = createOfflineContextMapData({
      destination: { municipality: 'Tagum' },
    });

    expect(context.features).toHaveLength(1);
    expect(context.features[0].properties.adm3_en).toBe('City of Tagum');
    const [west, south, east, north] = offlineContextMapBounds(context);
    expect(east).toBeGreaterThan(west);
    expect(north).toBeGreaterThan(south);
  });

  test('recognizes positions inside Davao del Norte and rejects nearby outside points', () => {
    expect(offlineContextContainsPosition({ lat: 7.4477, lng: 125.8071 })).toBe(true);
    expect(offlineContextContainsPosition({ lat: 7.1336, lng: 125.6847 })).toBe(true);
    expect(offlineContextContainsPosition({ lat: 7.0807, lng: 125.608 })).toBe(false);
  });

  test('normalizes city naming when selecting municipality context', () => {
    const samal = createOfflineContextMapData({
      destination: { municipality: 'Samal' },
    });
    const panabo = createOfflineContextMapData({
      destination: { municipality: 'Panabo' },
    });

    expect(samal.features[0].properties.adm3_en).toBe('Island Garden City of Samal');
    expect(panabo.features[0].properties.adm3_en).toBe('City of Panabo');
  });

  test('pins the bundled regional basemap metadata', () => {
    expect(OFFLINE_BASEMAP_META).toEqual(expect.objectContaining({
      region: 'Davao del Norte',
      maxzoom: 13,
      sizeBytes: 5939044,
    }));
  });

  test('wraps a local file URI with the MapLibre PMTiles protocol', () => {
    expect(toPmtilesSourceUrl('file:///maps/davao-del-norte.pmtiles'))
      .toBe('pmtiles://file:///maps/davao-del-norte.pmtiles');
  });

  test('creates a local vector style with recognizable geographic layers', () => {
    const style = createOfflineBasemapStyle('file:///maps/davao-del-norte.pmtiles');

    expect(style.sources['offline-basemap']).toEqual(expect.objectContaining({
      type: 'vector',
      url: 'pmtiles://file:///maps/davao-del-norte.pmtiles',
    }));
    expect(style.layers.map(layer => layer.id)).toEqual(expect.arrayContaining([
      'offline-earth',
      'offline-water',
      'offline-buildings',
      'offline-roads',
    ]));
  });
});
