import { markDataChanged } from "../../core/state/dataInvalidation.jsx";

export const listFavoriteDestinationIds = async deps => (
  deps.favoriteRepository?.listFavoriteIds?.() ?? []
);

export const isFavoriteDestination = async (deps, destinationId) => (
  deps.favoriteRepository?.isFavorite?.(destinationId) ?? false
);

export const setDestinationFavorite = async (deps, destinationId, favorite) => {
  if (!deps.favoriteRepository) {
    throw new Error('Favorites storage is unavailable.');
  }
  await deps.favoriteRepository.setFavorite(destinationId, favorite);
  markDataChanged('favorites');
  return favorite;
};

export const toggleDestinationFavorite = async (deps, destinationId, currentFavorite) => (
  setDestinationFavorite(deps, destinationId, !currentFavorite)
);
