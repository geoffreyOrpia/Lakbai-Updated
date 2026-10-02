import { getRoutingRegionAsset, routingReferenceFor } from '../assets/routingRegionAssets.jsx';
import { cacheBrowserAsset } from './browserAssetStorage.jsx';

const saved = new Map();
export const sharedRoutingStorage = {
  peek: region => saved.get(region) ?? null,
  status: region => saved.get(region) ?? null,
  ensure: async region => {
    if (!region) return null;
    const reference = routingReferenceFor(region);
    if (!reference) throw new Error('No routing dataset for this region');
    const asset = await cacheBrowserAsset(getRoutingRegionAsset(region), reference.bytes);
    const result = { ...asset, reference };
    saved.set(region, result);
    return result;
  },
};
