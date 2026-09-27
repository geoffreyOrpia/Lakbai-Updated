import {
  listDestinationsWithState,
  loadPackForViewing,
} from '../src/domain/usecases/destinationPacks.jsx';

const destinations = [
  {
    id: 'samal',
    name: 'Samal Island',
    area: 'Island Garden City of Samal',
    municipality: 'Samal',
    category: 'island',
    summary: 'Beaches and island stops',
  },
  {
    id: 'tagum',
    name: 'Tagum City',
    area: 'Tagum City',
    municipality: 'Tagum',
    category: 'city',
    summary: 'City landmarks and markets',
  },
];

const createDeps = () => ({
  destinationRepository: {
    getDestinations: jest.fn().mockResolvedValue({ items: destinations, source: 'bundled' }),
  },
  packRepository: {
    listSavedMeta: jest.fn().mockResolvedValue([{ packId: 'samal', version: 1 }]),
    listManifests: jest.fn().mockResolvedValue([
      { id: 'samal', version: 2 },
      { id: 'tagum', version: 1 },
    ]),
    getSavedPack: jest.fn(),
    getBundledPack: jest.fn(),
  },
});

describe('destination pack use cases', () => {
  test('merges saved state and detects an available bundled update', async () => {
    const deps = createDeps();

    const result = await listDestinationsWithState(deps);

    expect(result.source).toBe('bundled');
    expect(result.items).toEqual([
      expect.objectContaining({
        destination: destinations[0],
        saved: true,
        savedVersion: 1,
        updateAvailable: true,
      }),
      expect.objectContaining({
        destination: destinations[1],
        saved: false,
        savedVersion: null,
        updateAvailable: false,
      }),
    ]);
  });

  test('filters by category and normalized search query', async () => {
    const deps = createDeps();

    const result = await listDestinationsWithState(deps, {
      category: 'city',
      query: '  market  ',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].destination.id).toBe('tagum');
  });

  test('prefers a saved pack, then falls back to bundled content', async () => {
    const deps = createDeps();
    const saved = { id: 'samal', version: 2 };
    deps.packRepository.getSavedPack.mockResolvedValue(saved);

    await expect(loadPackForViewing(deps, 'samal')).resolves.toEqual({
      pack: saved,
      source: 'library',
    });
    expect(deps.packRepository.getBundledPack).not.toHaveBeenCalled();

    deps.packRepository.getSavedPack.mockResolvedValue(null);
    const bundled = { id: 'tagum', version: 1 };
    deps.packRepository.getBundledPack.mockResolvedValue(bundled);

    await expect(loadPackForViewing(deps, 'tagum')).resolves.toEqual({
      pack: bundled,
      source: 'bundled',
    });
  });

  test('returns none when a pack does not exist', async () => {
    const deps = createDeps();
    deps.packRepository.getSavedPack.mockResolvedValue(null);
    deps.packRepository.getBundledPack.mockResolvedValue(null);

    await expect(loadPackForViewing(deps, 'missing')).resolves.toEqual({
      pack: null,
      source: 'none',
    });
  });
});
