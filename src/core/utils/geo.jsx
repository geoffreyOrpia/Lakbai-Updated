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
 * cumulative progress (0..1) along the trail up to the closest point on a
 * segment. Local equirectangular projection is accurate enough at trail scale.
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
  if (points.length === 1) {
    return {
      closestIndex: 0,
      distanceToTrailM: haversineKm(position, points[0]) * 1000,
      progress: 0
    };
  }

  const metersPerDegreeLat = Math.PI * EARTH_RADIUS_KM * 1000 / 180;
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos(position.lat * Math.PI / 180);
  const localPoint = point => ({
    x: (point.lng - position.lng) * metersPerDegreeLng,
    y: (point.lat - position.lat) * metersPerDegreeLat
  });

  const full = totalDistanceKm(points);
  let cumulativeBeforeKm = 0;
  let best = {
    closestIndex: 0,
    distanceToTrailM: Number.POSITIVE_INFINITY,
    progress: 0
  };

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const a = localPoint(start);
    const b = localPoint(end);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared > 0
      ? Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSquared))
      : 0;
    const projectedX = a.x + t * dx;
    const projectedY = a.y + t * dy;
    const distanceM = Math.hypot(projectedX, projectedY);
    const segmentKm = haversineKm(start, end);

    if (distanceM < best.distanceToTrailM) {
      const distanceAlongKm = cumulativeBeforeKm + segmentKm * t;
      best = {
        closestIndex: t < 0.5 ? index : index + 1,
        distanceToTrailM: distanceM,
        progress: full > 0 ? Math.min(1, distanceAlongKm / full) : 0
      };
    }
    cumulativeBeforeKm += segmentKm;
  }

  return {
    ...best
  };
};
