import { Asset } from 'expo-asset';

const CACHE_NAME = 'lakbai-offline-assets-v1';
const prepared = new Map();
const inFlight = new Map();

export const cacheBrowserAsset = async (source, expectedBytes = null) => {
  if (!globalThis.caches) throw new Error('Offline saving requires HTTPS or localhost in this browser.');
  const asset = Asset.fromModule(source);
  const uri = new URL(asset.uri, globalThis.location.href).href;
  if (prepared.has(uri)) return prepared.get(uri);
  if (inFlight.has(uri)) return inFlight.get(uri);
  const task = (async () => {
    const cache = await globalThis.caches.open(CACHE_NAME);
    let response = await cache.match(uri);
    let blob = response ? await response.blob() : null;
    if (!blob || (expectedBytes !== null && blob.size !== expectedBytes)) {
      response = await fetch(uri);
      if (!response.ok) throw new Error('Could not save an offline asset. Please retry.');
      blob = await response.blob();
      if (expectedBytes !== null && blob.size !== expectedBytes) {
        throw new Error('Offline asset failed its size check. Please retry.');
      }
      await cache.put(uri, new Response(blob));
    }
    const result = { uri: URL.createObjectURL(blob), sizeBytes: blob.size };
    prepared.set(uri, result);
    return result;
  })();
  inFlight.set(uri, task);
  try { return await task; } finally { inFlight.delete(uri); }
};
