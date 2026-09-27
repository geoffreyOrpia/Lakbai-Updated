import { colors } from "../../theme.jsx";

const ATTRIBUTION = '© OpenStreetMap contributors · Protomaps';

export const toPmtilesSourceUrl = fileUri => {
  if (!fileUri) return null;
  return fileUri.startsWith('pmtiles://') ? fileUri : `pmtiles://${fileUri}`;
};

export const createOfflineBasemapStyle = fileUri => {
  const sourceUrl = toPmtilesSourceUrl(fileUri);
  if (!sourceUrl) return null;

  return {
    version: 8,
    sources: {
      'offline-basemap': {
        type: 'vector',
        url: sourceUrl,
        attribution: ATTRIBUTION,
      },
    },
    layers: [
      {
        id: 'offline-background',
        type: 'background',
        paint: {
          'background-color': '#F6F2EA',
        },
      },
      {
        id: 'offline-earth',
        type: 'fill',
        source: 'offline-basemap',
        'source-layer': 'earth',
        paint: {
          'fill-color': '#F3F0E7',
        },
      },
      {
        id: 'offline-landcover',
        type: 'fill',
        source: 'offline-basemap',
        'source-layer': 'landcover',
        paint: {
          'fill-color': '#E7F0E5',
          'fill-opacity': 0.58,
        },
      },
      {
        id: 'offline-landuse',
        type: 'fill',
        source: 'offline-basemap',
        'source-layer': 'landuse',
        paint: {
          'fill-color': '#EBEFE9',
          'fill-opacity': 0.52,
        },
      },
      {
        id: 'offline-water',
        type: 'fill',
        source: 'offline-basemap',
        'source-layer': 'water',
        paint: {
          'fill-color': '#CFE4EC',
        },
      },
      {
        id: 'offline-buildings',
        type: 'fill',
        source: 'offline-basemap',
        'source-layer': 'buildings',
        minzoom: 12,
        paint: {
          'fill-color': '#DDD8CE',
          'fill-opacity': 0.76,
        },
      },
      {
        id: 'offline-roads-casing',
        type: 'line',
        source: 'offline-basemap',
        'source-layer': 'roads',
        minzoom: 7,
        paint: {
          'line-color': colors.borderStrong,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 0.6,
            11, 1.4,
            14, 3.6,
          ],
        },
      },
      {
        id: 'offline-roads',
        type: 'line',
        source: 'offline-basemap',
        'source-layer': 'roads',
        minzoom: 7,
        paint: {
          'line-color': '#FFFFFF',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 0.35,
            11, 0.95,
            14, 2.8,
          ],
        },
      },
      {
        id: 'offline-major-roads',
        type: 'line',
        source: 'offline-basemap',
        'source-layer': 'roads',
        minzoom: 6,
        filter: [
          'match',
          ['get', 'kind_detail'],
          ['motorway', 'trunk', 'primary', 'secondary'],
          true,
          false,
        ],
        paint: {
          'line-color': '#F4B77C',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 0.75,
            10, 1.6,
            14, 3.5,
          ],
        },
      },
    ],
  };
};
