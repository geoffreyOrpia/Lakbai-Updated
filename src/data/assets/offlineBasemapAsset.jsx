export const OFFLINE_BASEMAP_META = Object.freeze({
  region: 'Davao del Norte',
  source: 'https://build.protomaps.com/20260925.pmtiles',
  bounds: [125.305271, 6.894583, 125.92785, 8.000306],
  maxzoom: 15,
  sizeBytes: 23872600,
  revision: '2d3a1c0f5c4c',
  attribution: '© OpenStreetMap contributors · Protomaps',
});

export const getOfflineBasemapModule = () => require('../../../assets/maps/davao-del-norte.pmtiles');
