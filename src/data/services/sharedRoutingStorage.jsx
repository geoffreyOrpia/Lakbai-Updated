import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { createSharedRoutingStore } from '../../core/offline/sharedRoutingStore.jsx';
import { getRoutingRegionAsset, routingReferenceFor } from '../assets/routingRegionAssets.jsx';

const directoryFor = reference => new Directory(Paths.document, 'lakbaylokal', 'routing', reference.version);
export const sharedRoutingStorage = createSharedRoutingStore({
  referenceFor: routingReferenceFor,
  fileFor: (reference, staging) => new File(directoryFor(reference),
    `${reference.regionId}-${reference.md5}.routing${staging ? '.staging' : ''}`),
  prepareDirectory: reference => directoryFor(reference).create({ intermediates: true, idempotent: true }),
  materialize: async (region, target) => {
    const asset = Asset.fromModule(getRoutingRegionAsset(region));
    await asset.downloadAsync();
    if (!asset.localUri) throw new Error('Bundled routing data is not available locally. Retry saving this pack.');
    new File(asset.localUri).copy(target);
  },
});
