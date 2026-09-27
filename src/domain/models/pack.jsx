export const TRAIL_DIFFICULTIES = Object.freeze(['easy', 'moderate', 'hard']);

export const isTrailDifficulty = (value) => TRAIL_DIFFICULTIES.includes(value);

export const createPackManifest = ({ destination, pack, sizeKb }) => ({
  id: pack.id,
  name: destination.name,
  municipality: destination.municipality,
  category: destination.category,
  version: pack.version,
  updatedAt: pack.updatedAt,
  sizeKb,
  trailsCount: pack.trails.length,
  spotsCount: pack.spots.length,
});
