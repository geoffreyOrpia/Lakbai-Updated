import { jest, beforeEach, test, expect } from '@jest/globals';
import { createOfflinePackStorage } from '../src/data/services/offlinePackStorage.web.jsx';
const mockEntries = new Map();
let mockAssetFailure = false;
jest.mock('../src/data/services/browserAssetStorage.jsx', () => ({
  cacheBrowserAsset: async () => {
    if (mockAssetFailure) throw new Error('asset unavailable');
    return { uri: 'blob:basemap', sizeBytes: 12 };
  },
}));
jest.mock('../src/data/services/sharedRoutingStorage.jsx', () => ({
  sharedRoutingStorage: { ensure: async () => ({ uri: 'blob:routing', sizeBytes: 13,
    reference: { regionId: 'samal' } }) },
}));
jest.mock('../src/data/assets/offlineBasemapAsset.jsx', () => ({
  getOfflineBasemapModule: () => 1, OFFLINE_BASEMAP_META: { sizeBytes: 12 },
}));
jest.mock('../src/data/assets/destinationPhotos.jsx', () => ({ getDestinationPhotoModule: () => 2 }));

const pack = version => ({ id: 'samal', version, destination: { name: 'Samal Island',
  photos: [{ key: 'samal-island' }] }, spots: [], trails: [] });
beforeEach(() => {
  mockEntries.clear(); mockAssetFailure = false;
  global.Blob = require('node:buffer').Blob;
  global.location = { origin: 'http://localhost:8081', href: 'http://localhost:8081/' };
  global.Response = class {
    constructor(body) { this.body = body; }
    async json() { return JSON.parse(this.body); }
  };
  global.caches = { open: async () => ({
    match: async key => mockEntries.get(key),
    put: async (key, value) => mockEntries.set(key, value),
    delete: async key => mockEntries.delete(key),
  }) };
  global.URL.createObjectURL = jest.fn(() => 'blob:pack');
  global.URL.revokeObjectURL = jest.fn();
});

test('browser save persists the pack and a new storage instance can read and delete it', async () => {
  const status = await createOfflinePackStorage().savePack(pack(1));
  expect(status.mapUri).toBe('blob:pack');
  expect(status.routingGraphUri).toBe('blob:routing');
  expect(status.basemapUri).toBe('blob:basemap');
  const response = [...mockEntries.values()][0];
  const stored = await response.json();
  expect(JSON.parse(stored.files['pack.json']).version).toBe(1);
  expect(stored).not.toHaveProperty('routing');
  const reopened = createOfflinePackStorage();
  expect(await reopened.ensureReady('samal')).not.toBeNull();
  await reopened.removePack('samal');
  expect(await reopened.getStatus('samal')).toBeNull();
});

test('a failed asset save leaves the previous browser pack intact', async () => {
  const store = createOfflinePackStorage();
  await store.savePack(pack(1));
  mockAssetFailure = true;
  await expect(store.savePack(pack(2))).rejects.toThrow('asset unavailable');
  const stored = await [...mockEntries.values()][0].json();
  expect(JSON.parse(stored.files['pack.json']).version).toBe(1);
});
