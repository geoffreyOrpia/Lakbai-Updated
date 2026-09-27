import { haversineKm } from "../utils/geo.jsx";

const EARTH_RADIUS_KM = 6371;

const routePoints = route => (
  (route?.geometry?.coordinates ?? []).map(([lng, lat]) => ({ lat, lng }))
);

export const projectPositionOntoRoute = (route, position) => {
  const points = routePoints(route);
  if (!position || points.length < 2) {
    return {
      distanceToRouteM: Number.POSITIVE_INFINITY,
      distanceAlongKm: 0,
      remainingKm: route?.distanceKm ?? 0,
      progress: 0,
    };
  }

  const metersPerDegreeLat = Math.PI * EARTH_RADIUS_KM * 1000 / 180;
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos(position.lat * Math.PI / 180);
  const localPoint = point => ({
    x: (point.lng - position.lng) * metersPerDegreeLng,
    y: (point.lat - position.lat) * metersPerDegreeLat,
  });

  let cumulativeKm = 0;
  let best = {
    distanceToRouteM: Number.POSITIVE_INFINITY,
    distanceAlongKm: 0,
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

    if (distanceM < best.distanceToRouteM) {
      best = {
        distanceToRouteM: distanceM,
        distanceAlongKm: cumulativeKm + segmentKm * t,
      };
    }
    cumulativeKm += segmentKm;
  }

  const totalDistanceKm = route.distanceKm || cumulativeKm;
  const distanceAlongKm = Math.min(totalDistanceKm, best.distanceAlongKm);
  const remainingKm = Math.max(0, totalDistanceKm - distanceAlongKm);
  return {
    ...best,
    distanceAlongKm,
    remainingKm,
    progress: totalDistanceKm > 0 ? Math.min(1, distanceAlongKm / totalDistanceKm) : 0,
  };
};

export const nextRouteManeuver = (route, distanceAlongKm) => {
  const maneuvers = route?.maneuvers ?? [];
  const next = maneuvers.find(maneuver => maneuver.distanceAlongKm > distanceAlongKm + 0.01)
    ?? maneuvers[maneuvers.length - 1]
    ?? null;
  return {
    maneuver: next,
    distanceKm: next ? Math.max(0, next.distanceAlongKm - distanceAlongKm) : null,
  };
};

export const remainingDurationMin = (route, remainingKm) => {
  if (!route?.distanceKm || !route?.durationMin) return 0;
  return Math.max(0, Math.ceil(route.durationMin * remainingKm / route.distanceKm));
};

export const placesAlongRoute = (
  route,
  places,
  distanceAlongKm = 0,
  {
    corridorM = 180,
    minimumAheadKm = 0.03,
    maxResults = 3,
  } = {},
) => {
  if (!route || !Array.isArray(places) || !places.length) return [];

  return places
    .filter(place => Number.isFinite(place?.lat) && Number.isFinite(place?.lng))
    .map(place => {
      const projection = projectPositionOntoRoute(route, place);
      return {
        ...place,
        distanceFromRouteM: projection.distanceToRouteM,
        routeDistanceKm: projection.distanceAlongKm,
        distanceAheadKm: Math.max(0, projection.distanceAlongKm - distanceAlongKm),
      };
    })
    .filter(place => (
      place.distanceFromRouteM <= corridorM
      && place.routeDistanceKm >= distanceAlongKm + minimumAheadKm
    ))
    .sort((a, b) => a.routeDistanceKm - b.routeDistanceKm)
    .slice(0, maxResults);
};
