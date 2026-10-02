import { buildOfflinePackFiles } from '../../core/offline/offlinePackFiles.jsx';
import { getDestinationPhotoModule } from '../assets/destinationPhotos.jsx';
import { getOfflineBasemapModule, OFFLINE_BASEMAP_META } from '../assets/offlineBasemapAsset.jsx';
import { routingRegionFor } from '../assets/routingRegionAssets.jsx';
import { sharedRoutingStorage } from './sharedRoutingStorage.jsx';
import { cacheBrowserAsset } from './browserAssetStorage.jsx';

const PACK_CACHE = 'lakbai-offline-packs-v1';
const keyFor = id => new URL(`/__lakbai_offline__/packs/${encodeURIComponent(id)}`, globalThis.location.origin).href;
const blobUrls = new Map();
let basemap = null;

const statusFor = async id => {
  const cache = await globalThis.caches.open(PACK_CACHE);
  const response = await cache.match(keyFor(id));
  if (!response) return null;
  const { files, sizeBytes } = await response.json();
  const urls = {};
  for (const name of ['places.geojson', 'context.geojson', 'manifest.json']) {
    const key = `${id}/${name}`;
    const previous = blobUrls.get(key);
    if (previous) URL.revokeObjectURL(previous);
    urls[name] = URL.createObjectURL(new Blob([files[name]], { type: 'application/json' }));
    blobUrls.set(key, urls[name]);
  }
  return {
    mapUri: urls['places.geojson'], contextMapUri: urls['context.geojson'],
    manifestUri: urls['manifest.json'], sizeBytes,
    routingGraphUri: null, sharedRouting: null,
    routingGraphSizeBytes: 0,
    basemapUri: basemap?.uri ?? null, basemapSizeBytes: basemap?.sizeBytes ?? 0,
    totalSizeBytes: sizeBytes + (basemap?.sizeBytes ?? 0),
  };
};

const ensureBasemap = async () => {
  basemap = await cacheBrowserAsset(getOfflineBasemapModule(), OFFLINE_BASEMAP_META.sizeBytes);
  return basemap;
};

export const createOfflinePackStorage = () => ({
  getBasemapStatus: async () => basemap,
  ensureBasemapReady: ensureBasemap,
  savePack: async pack => {
    // Prepare every asset before replacing the saved pack marker. Failed saves
    // leave any previously saved version available.
    await ensureBasemap();
    for (const photo of pack.destination?.photos ?? []) {
      const source = getDestinationPhotoModule(photo.key);
      if (source) await cacheBrowserAsset(source);
    }
    const region = routingRegionFor(pack.id);
    const routing = region ? await sharedRoutingStorage.ensure(region) : null;
    const files = buildOfflinePackFiles(pack, Date.now(), [], null, routing?.reference ?? null);
    const sizeBytes = new Blob(Object.values(files)).size;
    const cache = await globalThis.caches.open(PACK_CACHE);
    // Blob URLs are session-local; store routing references, never blob URLs.
    await cache.put(keyFor(pack.id), new Response(JSON.stringify({ files, sizeBytes }), {
      headers: { 'Content-Type': 'application/json' },
    }));
    return createOfflinePackStorage().getStatus(pack.id);
  },
  getStatus: async id => {
    const status = await statusFor(id);
    if (!status) return null;
    const routing = await sharedRoutingStorage.ensure(routingRegionFor(id));
    return { ...status, routingGraphUri: routing?.uri ?? null,
      sharedRouting: routing?.reference ?? null, routingGraphSizeBytes: routing?.sizeBytes ?? 0,
      totalSizeBytes: status.sizeBytes + (basemap?.sizeBytes ?? 0) + (routing?.sizeBytes ?? 0) };
  },
  ensureReady: async id => {
    await ensureBasemap();
    return createOfflinePackStorage().getStatus(id);
  },
  removePack: async id => {
    const cache = await globalThis.caches.open(PACK_CACHE);
    await cache.delete(keyFor(id));
    for (const [key, uri] of blobUrls) {
      if (key.startsWith(`${id}/`)) { URL.revokeObjectURL(uri); blobUrls.delete(key); }
    }
  },
});
