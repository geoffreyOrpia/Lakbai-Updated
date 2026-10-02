import { jest, beforeEach, test, expect } from '@jest/globals';
import { cacheBrowserAsset } from '../src/data/services/browserAssetStorage.jsx';
jest.mock('expo-asset', () => ({ Asset: { fromModule: source => ({ uri: source }) } }));

const entries = new Map();
beforeEach(() => {
  entries.clear();
  global.Blob = require('node:buffer').Blob;
  global.Response = class {
    constructor(body) { this.body = body; this.ok = true; }
    async blob() { return this.body; }
  };
  global.location = { origin: 'http://localhost:8081', href: 'http://localhost:8081/' };
  global.caches = { open: async () => ({
    match: async key => entries.get(key),
    put: async (key, value) => entries.set(key, value),
  }) };
  global.URL.createObjectURL = jest.fn(() => 'blob:asset');
  global.fetch = jest.fn(async () => new Response(new Blob(['routing'])));
});

test('previously cached browser assets can be prepared without a network request', async () => {
  entries.set('http://localhost:8081/offline.routing', new Response(new Blob(['routing'])));
  global.fetch.mockRejectedValue(new Error('offline'));
  const result = await cacheBrowserAsset('/offline.routing', 7);
  expect(result.sizeBytes).toBe(7);
  expect(result.uri).toBe('blob:asset');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('concurrent preparations download once and persist the asset', async () => {
  await Promise.all([cacheBrowserAsset('/concurrent.routing', 7), cacheBrowserAsset('/concurrent.routing', 7)]);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(entries.has('http://localhost:8081/concurrent.routing')).toBe(true);
});

test('an incomplete download is rejected without storing it', async () => {
  await expect(cacheBrowserAsset('/broken.routing', 100)).rejects.toThrow('size check');
  expect(entries.has('http://localhost:8081/broken.routing')).toBe(false);
});
