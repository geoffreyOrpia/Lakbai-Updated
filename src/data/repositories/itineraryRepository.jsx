export class LocalItineraryRepository {
  constructor(dao) {
    this.dao = dao;
  }
  listItineraries = async ownerKey => {
    return this.dao.list(ownerKey);
  };
  saveItinerary = async itinerary => {
    await this.dao.save(itinerary);
  };
  deleteItinerary = async (id, ownerKey) => {
    await this.dao.remove(id, ownerKey);
  };
}
