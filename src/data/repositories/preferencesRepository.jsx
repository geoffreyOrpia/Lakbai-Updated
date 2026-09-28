export class LocalPreferencesRepository {
  constructor(dao) {
    this.dao = dao;
  }
  save = preferences => {
    return this.dao.save(preferences);
  };
  get = () => {
    return this.dao.get();
  };
  clear = () => {
    return this.dao.clear();
  };
}
