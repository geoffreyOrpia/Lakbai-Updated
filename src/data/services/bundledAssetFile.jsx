import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

const URI_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export const absoluteLocalAssetUri = uri => {
  if (typeof uri !== 'string' || !uri.trim()) return null;
  const value = uri.trim();
  if (URI_SCHEME.test(value)) return value;
  if (value.startsWith('/')) return `file://${value}`;
  return null;
};

/**
 * Materialize an Expo bundled asset to a FileSystem destination.
 *
 * Android's native File.copy bridge requires an absolute URI. expo-asset can
 * expose a local filesystem path without a URI scheme, so normalize it before
 * constructing the source File.
 */
export const copyBundledAsset = async (moduleSource, destination, missingMessage) => {
  const asset = Asset.fromModule(moduleSource);
  await asset.downloadAsync();
  const sourceUri = absoluteLocalAssetUri(asset.localUri);
  if (!sourceUri) {
    throw new Error(missingMessage ?? 'Bundled asset is not available locally.');
  }
  new File(sourceUri).copy(destination);
  return asset;
};
