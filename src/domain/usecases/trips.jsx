import { markDataChanged } from "../../core/state/dataInvalidation.jsx";

export const createItineraryId = () => {
  return `trip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};
export const listItineraries = async (deps, ownerKey) => {
  return deps.itineraryRepository.listItineraries(ownerKey);
};
export const saveItinerary = async (deps, itinerary) => {
  const result = await deps.itineraryRepository.saveItinerary(itinerary);
  markDataChanged('trips');
  return result;
};
export const deleteItinerary = async (deps, id, ownerKey) => {
  const result = await deps.itineraryRepository.deleteItinerary(id, ownerKey);
  markDataChanged('trips');
  return result;
};
