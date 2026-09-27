import { haversineKm } from "../../core/utils/geo.jsx";

const hasCoordinates = place => (
  Number.isFinite(place?.lat) && Number.isFinite(place?.lng)
);

const destinationAreaCenter = pack => {
  const spots = (pack.spots ?? []).filter(hasCoordinates);
  if (!spots.length) return null;
  return {
    id: 'destination-area',
    name: `${pack.destination?.name ?? pack.id} area`,
    category: pack.destination?.category ?? 'destination',
    lat: spots.reduce((sum, spot) => sum + spot.lat, 0) / spots.length,
    lng: spots.reduce((sum, spot) => sum + spot.lng, 0) / spots.length,
    description: 'Approximate area center derived from coordinates stored in this saved destination pack.',
    derivedCenter: true,
  };
};

const nearbyEntry = (pack, spot, fix, kind = 'place') => ({
  id: `${pack.id}:${spot.id}`,
  kind,
  destinationId: pack.id,
  destinationName: pack.destination?.name ?? pack.id,
  municipality: pack.destination?.municipality ?? '',
  category: spot.category ?? pack.destination?.category ?? 'place',
  spot,
  distanceKm: haversineKm(fix, {
    lat: spot.lat,
    lng: spot.lng,
  }),
});

export const rankNearbyPlaces = (packs, fix) => {
  if (!fix || !hasCoordinates(fix)) return [];
  return packs
    .filter(Boolean)
    .flatMap(pack => {
      const spots = (pack.spots ?? []).filter(hasCoordinates);
      const center = destinationAreaCenter(pack);
      return [
        ...(center ? [nearbyEntry(pack, center, fix, 'destination')] : []),
        ...spots.map(spot => nearbyEntry(pack, spot, fix)),
      ];
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
};

export const loadNearbySavedPlaces = async (deps, fix) => {
  const meta = await deps.packRepository.listSavedMeta();
  const packs = await Promise.all(meta.map(entry => deps.packRepository.getSavedPack(entry.packId)));
  return rankNearbyPlaces(packs, fix);
};
