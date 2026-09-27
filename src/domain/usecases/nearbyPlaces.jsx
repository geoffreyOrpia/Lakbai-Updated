import { haversineKm } from "../../core/utils/geo.jsx";

const hasCoordinates = place => (
  Number.isFinite(place?.lat) && Number.isFinite(place?.lng)
);

export const rankNearbyPlaces = (packs, fix) => {
  if (!fix || !hasCoordinates(fix)) return [];
  return packs
    .filter(Boolean)
    .flatMap(pack => (pack.spots ?? [])
      .filter(hasCoordinates)
      .map(spot => ({
        id: `${pack.id}:${spot.id}`,
        destinationId: pack.id,
        destinationName: pack.destination?.name ?? pack.id,
        municipality: pack.destination?.municipality ?? '',
        spot,
        distanceKm: haversineKm(fix, {
          lat: spot.lat,
          lng: spot.lng,
        }),
      })))
    .sort((a, b) => a.distanceKm - b.distanceKm);
};

export const loadNearbySavedPlaces = async (deps, fix) => {
  const meta = await deps.packRepository.listSavedMeta();
  const packs = await Promise.all(meta.map(entry => deps.packRepository.getSavedPack(entry.packId)));
  return rankNearbyPlaces(packs, fix);
};
