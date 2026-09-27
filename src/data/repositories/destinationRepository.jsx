/** Device-only destination catalog backed by SQLite. */
export class LocalDestinationRepository {
  constructor(cache) {
    this.cache = cache;
  }
  getDestinations = async (_filter = {}) => {
    return {
      items: await this.cache.listAll(),
      source: 'local'
    };
  };
  getDestination = async id => {
    return this.cache.get(id);
  };
}
