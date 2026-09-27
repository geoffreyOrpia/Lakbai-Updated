const EARTH_RADIUS_KM = 6371;
export const haversineKm = (a, b) => {
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};
/** Trail geometry stores [lng, lat] pairs; convert to LatLng. */
export const trailCoordinates = trail => {
  return trail.geometry.coordinates.map(([lng, lat]) => ({
    lat,
    lng
  }));
};
export const totalDistanceKm = points => {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += haversineKm(points[index - 1], points[index]);
  }
  return total;
};
export const boundsOf = points => {
  const lats = points.map(point => point.lat);
  const lngs = points.map(point => point.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs)
  };
};
/**
 * Projects a position onto the trail polyline.
 * Returns the closest vertex index, distance to the trail in meters, and
 * cumulative progress (0..1) along the trail up to that projection.
 */
export const projectOntoTrail = (trail, position) => {
  const points = trailCoordinates(trail);
  if (points.length === 0) {
    return {
      closestIndex: 0,
      distanceToTrailM: Number.POSITIVE_INFINITY,
      progress: 0
    };
  }
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  points.forEach((point, index) => {
    const distance = haversineKm(position, point);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  const cumulative = totalDistanceKm(points.slice(0, bestIndex + 1));
  const full = totalDistanceKm(points);
  return {
    closestIndex: bestIndex,
    distanceToTrailM: bestDistance * 1000,
    progress: full > 0 ? Math.min(1, cumulative / full) : 0
  };
};
