export class LocalNavigationSessionRepository {
  constructor(dao) {
    this.dao = dao;
  }

  saveActiveSession = session => this.dao.save(session);

  getActiveSession = () => this.dao.get();

  clearActiveSession = () => this.dao.clear();
}
