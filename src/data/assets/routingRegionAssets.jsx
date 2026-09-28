import manifest from './routing/manifest.json';
import { regionForPosition } from '../../core/routing/regionCoverage.jsx';

export const ROUTING_MANIFEST = manifest;
const destinationRegions = { panabo: 'mainland', tagum: 'mainland', samal: 'samal',
  'hagimit-falls': 'samal', 'monfort-bat-sanctuary': 'samal' };
export const routingRegionFor = (destinationId, target = null) => {
  if (Number.isFinite(target?.lat) && Number.isFinite(target?.lng)) {
    return regionForPosition(target, manifest);
  }
  return destinationRegions[destinationId] ?? null;
};
export const getRoutingRegionAsset = region => {
  if (region === 'mainland') return require('./routing/mainland.routing');
  if (region === 'samal') return require('./routing/samal.routing');
  return null;
};
export const routingReferenceFor = region => {
  const descriptor = manifest.regions[region];
  return descriptor ? { datasetId: manifest.id, version: manifest.version, regionId: region,
    md5: descriptor.md5, bytes: descriptor.bytes } : null;
};
