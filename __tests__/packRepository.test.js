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

    expect(offlineStorage.savePack).not.toHaveBeenCalled();
  });

  test('removing clears both SQLite state and local files', async () => {
    const { repository, meta, offlineStorage } = createRepository();

    await repository.removePack('tagum');

    expect(meta.remove).toHaveBeenCalledWith('tagum');
    expect(offlineStorage.removePack).toHaveBeenCalledWith('tagum');
  });

  test('rolls back local files if SQLite save fails', async () => {
    const { repository, meta, offlineStorage } = createRepository();
    meta.upsert.mockRejectedValue(new Error('sqlite failure'));

    await expect(repository.savePack('tagum')).rejects.toThrow('sqlite failure');

    expect(offlineStorage.removePack).toHaveBeenCalledWith('tagum');
  });
});
