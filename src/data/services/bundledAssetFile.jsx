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
const materializeAndroidEmbeddedAsset = async asset => {
  const resourceUri = typeof asset?.uri === 'string' ? asset.uri.trim() : '';
  if (!resourceUri || URI_SCHEME.test(resourceUri) || resourceUri.startsWith('/')) return null;

  // In Android production builds, React Native images may resolve to a drawable
  // resource name (for example "assets_destinations_hagimit_falls") and
  // expo-asset marks that value as already downloaded. Re-create the Asset
  // without a hash so downloadAsync reaches ExpoAsset's native Android resource
  // reader and writes the embedded resource to a real cache file.
  const materialized = new Asset({
    name: asset.name ?? '',
    type: asset.type ?? '',
    hash: null,
    uri: resourceUri,
    width: asset.width,
    height: asset.height,
  });
  await materialized.downloadAsync();
  return materialized;
};

export const copyBundledAsset = async (moduleSource, destination, missingMessage) => {
  let asset = Asset.fromModule(moduleSource);
  await asset.downloadAsync();
  let sourceUri = absoluteLocalAssetUri(asset.localUri);

  if (!sourceUri) {
    const materialized = await materializeAndroidEmbeddedAsset(asset);
    if (materialized) {
      asset = materialized;
      sourceUri = absoluteLocalAssetUri(asset.localUri);
    }
  }

  if (!sourceUri) {
    throw new Error(missingMessage ?? 'Bundled asset is not available locally.');
  }
  new File(sourceUri).copy(destination);
  return asset;
};
