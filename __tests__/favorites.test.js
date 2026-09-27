import {
  isFavoriteDestination,
  listFavoriteDestinationIds,
  setDestinationFavorite,
  toggleDestinationFavorite,
} from '../src/domain/usecases/favorites.jsx';

describe('Favorites use cases', () => {
  const createDeps = () => ({
    favoriteRepository: {
      listFavoriteIds: jest.fn().mockResolvedValue(['samal']),
      isFavorite: jest.fn().mockResolvedValue(true),
      setFavorite: jest.fn().mockResolvedValue(undefined),
    },
  });

  test('lists and checks favorite destinations from local storage', async () => {
    const deps = createDeps();
    await expect(listFavoriteDestinationIds(deps)).resolves.toEqual(['samal']);
    await expect(isFavoriteDestination(deps, 'samal')).resolves.toBe(true);
  });

  test('persists an explicit favorite state', async () => {
    const deps = createDeps();
    await expect(setDestinationFavorite(deps, 'tagum', true)).resolves.toBe(true);
    expect(deps.favoriteRepository.setFavorite).toHaveBeenCalledWith('tagum', true);
  });

  test('toggles from the current favorite state', async () => {
    const deps = createDeps();
    await expect(toggleDestinationFavorite(deps, 'samal', true)).resolves.toBe(false);
    expect(deps.favoriteRepository.setFavorite).toHaveBeenCalledWith('samal', false);
  });
});
