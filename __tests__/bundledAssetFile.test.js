let mockSourceAsset;
let mockConstructedAssets;
let mockCopies;

jest.mock('expo-asset', () => {
  class Asset {
    constructor(descriptor) {
      Object.assign(this, descriptor);
      this.localUri = null;
      this.downloaded = false;
      mockConstructedAssets.push(descriptor);
    }

    async downloadAsync() {
      this.localUri = `file:///cache/${this.name || 'asset'}.${this.type || 'bin'}`;
      this.downloaded = true;
      return this;
    }

    static fromModule() {
      return mockSourceAsset;
    }
  }

  return { Asset };
});

jest.mock('expo-file-system', () => ({
  File: class File {
    constructor(uri) {
      this.uri = uri;
    }

    copy(destination) {
      mockCopies.push({ from: this.uri, to: destination.uri });
    }
  },
}));

import { absoluteLocalAssetUri, copyBundledAsset } from '../src/data/services/bundledAssetFile.jsx';

beforeEach(() => {
  mockConstructedAssets = [];
  mockCopies = [];
  mockSourceAsset = null;
});

test('normalizes absolute local filesystem paths without changing real URIs', () => {
  expect(absoluteLocalAssetUri('/data/user/0/app/cache/photo.jpg')).toBe('file:///data/user/0/app/cache/photo.jpg');
  expect(absoluteLocalAssetUri('file:///data/user/0/app/cache/photo.jpg')).toBe('file:///data/user/0/app/cache/photo.jpg');
  expect(absoluteLocalAssetUri('content://media/photo/1')).toBe('content://media/photo/1');
  expect(absoluteLocalAssetUri('assets_destinations_hagimit_falls')).toBeNull();
});

test('copies an ordinary downloaded bundled asset directly', async () => {
  mockSourceAsset = {
    localUri: '/cache/hagimit-falls.jpg',
    uri: 'http://localhost/hagimit-falls.jpg',
    type: 'jpg',
    downloadAsync: jest.fn(async function downloadAsync() { return this; }),
  };
  const destination = { uri: 'file:///documents/hagimit-falls.jpg' };

  const result = await copyBundledAsset(1, destination);

  expect(result).toBe(mockSourceAsset);
  expect(mockSourceAsset.downloadAsync).toHaveBeenCalledTimes(1);
  expect(mockConstructedAssets).toHaveLength(0);
  expect(mockCopies).toEqual([{
    from: 'file:///cache/hagimit-falls.jpg',
    to: destination.uri,
  }]);
});

test('materializes an Android drawable resource before copying it', async () => {
  mockSourceAsset = {
    name: 'hagimit-falls',
    type: 'jpg',
    hash: 'bundled-image-hash',
    uri: 'assets_destinations_hagimit_falls',
    localUri: 'assets_destinations_hagimit_falls',
    width: 1280,
    height: 853,
    downloaded: true,
    downloadAsync: jest.fn(async function downloadAsync() { return this; }),
  };
  const destination = { uri: 'file:///documents/hagimit-falls.jpg' };

  const result = await copyBundledAsset(1, destination);

  expect(mockSourceAsset.downloadAsync).toHaveBeenCalledTimes(1);
  expect(mockConstructedAssets).toEqual([expect.objectContaining({
    name: 'hagimit-falls',
    type: 'jpg',
    hash: null,
    uri: 'assets_destinations_hagimit_falls',
  })]);
  expect(result).not.toBe(mockSourceAsset);
  expect(result.localUri).toBe('file:///cache/hagimit-falls.jpg');
  expect(mockCopies).toEqual([{
    from: 'file:///cache/hagimit-falls.jpg',
    to: destination.uri,
  }]);
});

test('preserves the caller error when no local or embedded resource can be materialized', async () => {
  mockSourceAsset = {
    localUri: 'not-a-file-uri',
    uri: 'https://example.com/photo.jpg',
    type: 'jpg',
    downloadAsync: jest.fn(async function downloadAsync() { return this; }),
  };

  await expect(copyBundledAsset(1, { uri: 'file:///documents/photo.jpg' }, 'photo unavailable'))
    .rejects.toThrow('photo unavailable');
  expect(mockConstructedAssets).toHaveLength(0);
  expect(mockCopies).toHaveLength(0);
});
