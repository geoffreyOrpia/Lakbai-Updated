import davaoDelNorteMunicipalities from "../../data/assets/davaoDelNorteMunicipalities.json";

const normalizeMunicipality = value => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/^island garden city of\s+/, '')
  .replace(/^city of\s+/, '')
  .replace(/\s+city$/, '');

const collectPositions = coordinates => {
  if (!Array.isArray(coordinates)) return [];
  if (
    coordinates.length >= 2
    && Number.isFinite(coordinates[0])
    && Number.isFinite(coordinates[1])
  ) {
    return [[coordinates[0], coordinates[1]]];
  }
  return coordinates.flatMap(collectPositions);
};

export const createOfflineContextMapData = pack => {
  const municipality = normalizeMunicipality(pack?.destination?.municipality);
  const features = (davaoDelNorteMunicipalities.features ?? []).filter(feature => {
    if (!municipality) return true;
    return normalizeMunicipality(feature?.properties?.adm3_en) === municipality;
  });

  return {
    type: 'FeatureCollection',
    features: features.length ? features : (davaoDelNorteMunicipalities.features ?? []),
  };
};

export const offlineContextMapBounds = geojson => {
  const positions = (geojson?.features ?? []).flatMap(feature => (
    collectPositions(feature?.geometry?.coordinates)
  ));
  if (!positions.length) return null;

  const lngs = positions.map(([lng]) => lng);
  const lats = positions.map(([, lat]) => lat);
  return [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats),
  ];
};

export const OFFLINE_CONTEXT_META = Object.freeze({
  region: 'Davao del Norte',
  dataset: 'Philippines JSON Maps — 2023 PSGC municipal boundaries',
  license: 'MIT',
  attribution: 'Administrative boundary geometry: James Faeldon / PSGC 2023',
});
