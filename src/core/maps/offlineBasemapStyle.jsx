import { colors } from "../../theme.jsx";

const ATTRIBUTION = '© OpenStreetMap contributors · Protomaps';

export const TOURISM_POI_GROUPS = Object.freeze({
  food: [
    'restaurant', 'cafe', 'fast_food', 'food_court', 'bakery', 'bbq',
  ],
  stay: [
    'hotel', 'hostel', 'guest_house', 'bed_and_breakfast', 'chalet', 'camp_site',
  ],
  safety: [
    'police', 'fire_station', 'ranger_station', 'hospital', 'clinic', 'doctors',
    'pharmacy', 'emergency_phone',
  ],
  essentials: [
    'fuel', 'charging_station', 'bus_stop', 'station', 'taxi', 'car_rental',
    'parking', 'information', 'toilets', 'drinking_water', 'atm', 'post_office',
  ],
  tourism: [
    'attraction', 'viewpoint', 'museum', 'artwork', 'memorial', 'beach', 'park',
    'picnic_site', 'marina', 'zoo', 'library', 'national_park', 'nature_reserve',
  ],
});

const poiFilter = kinds => [
  'match',
  ['get', 'kind'],
  kinds,
  true,
  false,
];

export const toPmtilesSourceUrl = fileUri => {
  if (!fileUri) return null;
  return fileUri.startsWith('pmtiles://') ? fileUri : `pmtiles://${fileUri}`;
};

export const createOfflineBasemapStyle = (fileUri, { showPlaceDots = true } = {}) => {
  const sourceUrl = toPmtilesSourceUrl(fileUri);
  if (!sourceUrl) return null;

  return {
    version: 8,
    light: {
      anchor: 'viewport',
      color: '#FFF8E9',
      intensity: 0.58,
      position: [1.2, 210, 42],
    },
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
        maxzoom: 13,
        paint: {
          'fill-color': '#DDD8CE',
          'fill-opacity': 0.76,
        },
      },
      {
        id: 'offline-buildings-3d',
        type: 'fill-extrusion',
        source: 'offline-basemap',
        'source-layer': 'buildings',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': '#D9D2C5',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            13, 0,
            14, ['coalesce', ['get', 'height'], 8],
          ],
          'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
          'fill-extrusion-opacity': 0.82,
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
      {
        id: 'offline-pois-tourism',
        type: 'circle',
        source: 'offline-basemap',
        'source-layer': 'pois',
        minzoom: 12,
        filter: poiFilter(TOURISM_POI_GROUPS.tourism),
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3.5, 16, 6],
          'circle-color': colors.accent,
          'circle-stroke-color': colors.white,
          'circle-stroke-width': 1.5,
        },
      },
      {
        id: 'offline-pois-food',
        type: 'circle',
        source: 'offline-basemap',
        'source-layer': 'pois',
        minzoom: 12,
        filter: poiFilter(TOURISM_POI_GROUPS.food),
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3.5, 16, 6],
          'circle-color': '#D96A2B',
          'circle-stroke-color': colors.white,
          'circle-stroke-width': 1.5,
        },
      },
      {
        id: 'offline-pois-stay',
        type: 'circle',
        source: 'offline-basemap',
        'source-layer': 'pois',
        minzoom: 12,
        filter: poiFilter(TOURISM_POI_GROUPS.stay),
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3.5, 16, 6],
          'circle-color': '#6B67C8',
          'circle-stroke-color': colors.white,
          'circle-stroke-width': 1.5,
        },
      },
      {
        id: 'offline-pois-safety',
        type: 'circle',
        source: 'offline-basemap',
        'source-layer': 'pois',
        minzoom: 12,
        filter: poiFilter(TOURISM_POI_GROUPS.safety),
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 6.5],
          'circle-color': colors.danger,
          'circle-stroke-color': colors.white,
          'circle-stroke-width': 1.7,
        },
      },
      {
        id: 'offline-pois-essentials',
        type: 'circle',
        source: 'offline-basemap',
        'source-layer': 'pois',
        minzoom: 12,
        filter: poiFilter(TOURISM_POI_GROUPS.essentials),
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3.5, 16, 6],
          'circle-color': colors.brandSea,
          'circle-stroke-color': colors.white,
          'circle-stroke-width': 1.5,
        },
      },
    ].filter(layer => showPlaceDots || !layer.id.startsWith('offline-pois-')),
  };
};
