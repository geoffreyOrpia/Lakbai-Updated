export const OFFLINE_BASEMAP_META = Object.freeze({
  region: 'Davao del Norte',
  source: 'https://build.protomaps.com/20260925.pmtiles',
  bounds: [125.305271, 6.894583, 125.92785, 8.000306],
  maxzoom: 13,
  sizeBytes: 5939044,
  attribution: '© OpenStreetMap contributors · Protomaps',
});

export const getOfflineBasemapModule = () => require('../../../assets/maps/davao-del-norte.pmtiles');
