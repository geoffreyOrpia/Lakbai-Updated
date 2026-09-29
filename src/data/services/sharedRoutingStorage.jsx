import { Directory, File, Paths } from 'expo-file-system';
import { createSharedRoutingStore } from '../../core/offline/sharedRoutingStore.jsx';
import { getRoutingRegionAsset, routingReferenceFor } from '../assets/routingRegionAssets.jsx';
import { copyBundledAsset } from './bundledAssetFile.jsx';

const directoryFor = reference => new Directory(Paths.document, 'lakbaylokal', 'routing', reference.version);
export const sharedRoutingStorage = createSharedRoutingStore({
  referenceFor: routingReferenceFor,
  fileFor: (reference, staging) => new File(directoryFor(reference),
    `${reference.regionId}-${reference.md5}.routing${staging ? '.staging' : ''}`),
  prepareDirectory: reference => directoryFor(reference).create({ intermediates: true, idempotent: true }),
  materialize: (region, target) => copyBundledAsset(
    getRoutingRegionAsset(region),
    target,
    'Bundled routing data is not available locally. Retry saving this pack.',
  ),
});
