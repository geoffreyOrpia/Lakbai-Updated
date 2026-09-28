export class LocalDiscoveryRepository {
  constructor(dao) {
    this.dao = dao;
  }

  getState = () => this.dao.get();
  saveState = state => this.dao.save(state);
}
