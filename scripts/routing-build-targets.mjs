import { readFileSync } from 'node:fs';

// Reuse the province boundary asset instead of maintaining a second hand-drawn
// extent. The bounding box also contains neighboring land; it is not a claim
// that every road or municipality has been validated.
export const routingBuildTarget = region => {
  if (!region) return null;
  if (region !== 'davao-del-norte') throw new Error(`Unknown routing region: ${region}`);
  const boundaries = JSON.parse(readFileSync(
    new URL('../src/data/assets/davaoDelNorteMunicipalities.json', import.meta.url), 'utf8',
  ));
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const visit = coordinates => {
    if (typeof coordinates[0] === 'number') {
      bounds[0] = Math.min(bounds[0], coordinates[0]);
      bounds[1] = Math.min(bounds[1], coordinates[1]);
      bounds[2] = Math.max(bounds[2], coordinates[0]);
      bounds[3] = Math.max(bounds[3], coordinates[1]);
    } else coordinates.forEach(visit);
  };
  boundaries.features.forEach(feature => visit(feature.geometry.coordinates));
  return {
    id: 'davao-del-norte-routing',
    name: 'Davao del Norte road and walking network',
    output: 'src/data/assets/davaoDelNorteRoutingGraph.json',
    bounds,
    coverage: {
      region,
      province: 'Davao del Norte',
      extent: 'province-bounding-box',
      boundaryAsset: 'davaoDelNorteMunicipalities.json',
      intendedAreas: boundaries.features.map(feature => ({
        name: feature.properties.adm3_en,
        psgc: String(feature.properties.adm3_psgc),
      })),
      validationStatus: 'unverified',
    },
  };
};
