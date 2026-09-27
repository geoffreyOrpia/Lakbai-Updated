export const createItineraryId = () => {
  return `trip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};
export const listItineraries = async (deps, ownerKey) => {
  return deps.itineraryRepository.listItineraries(ownerKey);
};
export const saveItinerary = async (deps, itinerary) => {
  return deps.itineraryRepository.saveItinerary(itinerary);
};
export const deleteItinerary = async (deps, id, ownerKey) => {
  return deps.itineraryRepository.deleteItinerary(id, ownerKey);
};
