import { destinations } from "./destinations.jsx";
import { packs } from "./packs.jsx";
import { verificationForDestination } from "./contentVerification.jsx";
const REGION_PROVINCE = 'Davao del Norte';
const sizeInKb = value => Math.max(1, Math.round(JSON.stringify(value).length / 1024));
const regionDestinations = destinations.filter(destination => destination.province === REGION_PROVINCE);
const regionPacks = packs
  .filter(pack => regionDestinations.some(destination => destination.id === pack.id))
  .map(pack => {
    // Prototype trail lines are kept out of release navigation until a local
    // tourism or mapping authority verifies every waypoint.
    const verifiedTrails = pack.trails.filter(trail => trail.routeVerified === true);
    const routeSuggestions = pack.trails.map(trail => ({
      id: trail.id,
      name: trail.name,
      difficulty: trail.difficulty,
      estimatedDistanceKm: trail.distanceKm,
      estimatedDurationMin: trail.durationMin,
      description: trail.description,
      planningOnly: trail.routeVerified !== true,
      stops: trail.waypoints.map(waypoint => ({
        id: waypoint.id,
        name: waypoint.name,
        type: waypoint.type,
        note: waypoint.note ?? ''
      }))
    }));
    return {
      ...pack,
      trails: verifiedTrails,
      routeSuggestions,
      withheldTrailsCount: pack.trails.length - verifiedTrails.length
    };
  });
const packById = new Map(regionPacks.map(pack => [pack.id, pack]));
export const seedDestinations = regionDestinations.map(destination => {
  const pack = packById.get(destination.id);
  return {
    ...destination,
    verification: verificationForDestination(destination.id),
    version: pack?.version ?? 0,
    sizeKb: pack ? sizeInKb(pack) : null,
    spotsCount: pack?.spots.length ?? null,
    trailsCount: pack?.trails.length ?? null,
    routeSuggestionsCount: pack?.routeSuggestions.length ?? null,
    withheldTrailsCount: pack?.withheldTrailsCount ?? 0
  };
});
const destinationById = new Map(seedDestinations.map(destination => [destination.id, destination]));
export const seedPacks = regionPacks.flatMap(pack => {
  const destination = destinationById.get(pack.id);
  if (!destination) return [];
  return [{
    ...pack,
    sizeKb: sizeInKb(pack),
    destination
  }];
});
export const seedManifests = seedPacks.map(pack => ({
  id: pack.id,
  name: pack.destination.name,
  municipality: pack.destination.municipality,
  category: pack.destination.category,
  version: pack.version,
  updatedAt: pack.updatedAt,
  sizeKb: pack.sizeKb,
  trailsCount: pack.trails.length,
  routeSuggestionsCount: pack.routeSuggestions.length,
  spotsCount: pack.spots.length,
  withheldTrailsCount: pack.withheldTrailsCount
}));
