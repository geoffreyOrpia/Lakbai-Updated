export class LocalFavoriteRepository {
  constructor(dao) {
    this.dao = dao;
  }
  listFavoriteIds = () => this.dao.list();
  isFavorite = destinationId => this.dao.has(destinationId);
  setFavorite = (destinationId, favorite) => this.dao.set(destinationId, favorite);
}
