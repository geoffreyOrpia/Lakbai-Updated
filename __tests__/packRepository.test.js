import { PackRepositoryImpl } from '../src/data/repositories/packRepository.jsx';

const pack = {
  id: 'tagum',
  version: 4,
  updatedAt: '2026-09-27T08:00:00.000Z',
  destination: {
    name: 'Tagum City',
  },
};

const createRepository = ({
  savedMeta = null,
  offlineStatus = null,
} = {}) => {
  const content = {
    get: jest.fn().mockResolvedValue(pack),
    listManifests: jest.fn().mockResolvedValue([]),
  };
  const meta = {
    get: jest.fn().mockResolvedValue(savedMeta),
    list: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const offlineStorage = {
    getStatus: jest.fn().mockResolvedValue(offlineStatus),
    ensureReady: jest.fn().mockResolvedValue(offlineStatus),
    getBasemapStatus: jest.fn().mockResolvedValue(null),
    ensureBasemapReady: jest.fn().mockResolvedValue(null),
    savePack: jest.fn().mockResolvedValue({
      mapUri: 'file:///packs/tagum/places.geojson',
    }),
    removePack: jest.fn().mockResolvedValue(undefined),
  };
  return {
    repository: new PackRepositoryImpl(content, meta, offlineStorage),
    content,
    meta,
    offlineStorage,
  };
};

describe('PackRepositoryImpl durable offline files', () => {
  test('saving writes the offline bundle before marking the pack saved', async () => {
    const { repository, meta, offlineStorage } = createRepository();
    const calls = [];
    offlineStorage.savePack.mockImplementation(async () => {
      calls.push('files');
    });
    meta.upsert.mockImplementation(async () => {
      calls.push('meta');
    });

    await repository.savePack('tagum');

    expect(calls).toEqual(['files', 'meta']);
    expect(offlineStorage.savePack).toHaveBeenCalledWith(pack);
    expect(meta.upsert).toHaveBeenCalledWith(expect.objectContaining({
      packId: 'tagum',
      version: 4,
    }));
  });

  test('backfills local files for a legacy SQLite-saved pack', async () => {
    const { repository, offlineStorage } = createRepository({
      savedMeta: { packId: 'tagum', version: 4 },
      offlineStatus: null,
    });

    await expect(repository.getSavedPack('tagum')).resolves.toEqual(pack);

    expect(offlineStorage.ensureReady).toHaveBeenCalledWith('tagum');
    expect(offlineStorage.savePack).toHaveBeenCalledWith(pack);
  });

  test('does not rewrite a complete offline bundle when reading a saved pack', async () => {
    const status = {
      mapUri: 'file:///packs/tagum/places.geojson',
    };
    const { repository, offlineStorage } = createRepository({
      savedMeta: { packId: 'tagum', version: 4 },
      offlineStatus: status,
    });

    await repository.getSavedPack('tagum');

    expect(offlineStorage.ensureReady).toHaveBeenCalledWith('tagum');
    expect(offlineStorage.savePack).not.toHaveBeenCalled();
  });

  test('status reads do not prepare pack or basemap assets', async () => {
    const status = { mapUri: 'file:///packs/tagum/places.geojson' };
    const { repository, offlineStorage } = createRepository({ offlineStatus: status });
    offlineStorage.getBasemapStatus.mockResolvedValue({ uri: 'file:///maps/map.pmtiles' });

    await expect(repository.getOfflineBundleStatus('tagum')).resolves.toBe(status);
    await expect(repository.getOfflineBasemapStatus()).resolves.toEqual({ uri: 'file:///maps/map.pmtiles' });

    expect(offlineStorage.getStatus).toHaveBeenCalledWith('tagum');
    expect(offlineStorage.ensureReady).not.toHaveBeenCalled();
    expect(offlineStorage.ensureBasemapReady).not.toHaveBeenCalled();
  });

  test('removing clears both SQLite state and local files', async () => {
    const { repository, meta, offlineStorage } = createRepository();

    await repository.removePack('tagum');

    expect(meta.remove).toHaveBeenCalledWith('tagum');
    expect(offlineStorage.removePack).toHaveBeenCalledWith('tagum');
  });

  test('rolls back local files if the first SQLite save fails', async () => {
    const { repository, meta, offlineStorage } = createRepository();
    meta.upsert.mockRejectedValue(new Error('sqlite failure'));

    await expect(repository.savePack('tagum')).rejects.toThrow('sqlite failure');

    expect(offlineStorage.removePack).toHaveBeenCalledWith('tagum');
  });

  test('keeps refreshed files if update metadata fails so the update can be retried', async () => {
    const { repository, meta, offlineStorage } = createRepository({
      savedMeta: { packId: 'tagum', version: 3 },
    });
    meta.upsert.mockRejectedValue(new Error('sqlite failure'));

    await expect(repository.savePack('tagum')).rejects.toThrow('sqlite failure');

    expect(offlineStorage.savePack).toHaveBeenCalledWith(pack);
    expect(offlineStorage.removePack).not.toHaveBeenCalled();
  });
});
