import { haversineKm } from "../utils/geo.jsx";

const EARTH_RADIUS_KM = 6371;

const routePoints = route => (
  (route?.geometry?.coordinates ?? []).map(([lng, lat]) => ({ lat, lng }))
);

const sameCoordinate = (a, b) => (
  Array.isArray(a)
  && Array.isArray(b)
  && Math.abs(a[0] - b[0]) < 1e-10
  && Math.abs(a[1] - b[1]) < 1e-10
);

export const splitRouteGeometryAtDistance = (route, distanceAlongKm = 0) => {
  const coordinates = route?.geometry?.coordinates ?? [];
  if (coordinates.length < 2) {
    return {
      completed: null,
      remaining: route?.geometry ?? null,
    };
  }

  const segmentLengths = [];
  let totalKm = 0;
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    const lengthKm = haversineKm(
      { lng: start[0], lat: start[1] },
      { lng: end[0], lat: end[1] },
    );
    segmentLengths.push(lengthKm);
    totalKm += lengthKm;
  }

  const targetKm = Math.max(0, Math.min(totalKm, distanceAlongKm ?? 0));
  if (targetKm <= 0) {
    return {
      completed: null,
      remaining: { type: 'LineString', coordinates: [...coordinates] },
    };
  }
  if (targetKm >= totalKm) {
    return {
      completed: { type: 'LineString', coordinates: [...coordinates] },
      remaining: null,
    };
  }

  let cumulativeKm = 0;
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentKm = segmentLengths[index];
    const segmentEndKm = cumulativeKm + segmentKm;
    if (targetKm <= segmentEndKm || index === segmentLengths.length - 1) {
      const start = coordinates[index];
      const end = coordinates[index + 1];
      const ratio = segmentKm > 0
        ? Math.max(0, Math.min(1, (targetKm - cumulativeKm) / segmentKm))
        : 0;
      const splitPoint = [
        start[0] + (end[0] - start[0]) * ratio,
        start[1] + (end[1] - start[1]) * ratio,
      ];
      const completedCoordinates = coordinates.slice(0, index + 1);
      if (!sameCoordinate(completedCoordinates.at(-1), splitPoint)) {
        completedCoordinates.push(splitPoint);
      }
      const remainingCoordinates = [splitPoint, ...coordinates.slice(index + 1)];
      return {
        completed: completedCoordinates.length >= 2
          ? { type: 'LineString', coordinates: completedCoordinates }
          : null,
        remaining: remainingCoordinates.length >= 2
          ? { type: 'LineString', coordinates: remainingCoordinates }
          : null,
      };
    }
    cumulativeKm = segmentEndKm;
  }

  return {
    completed: null,
    remaining: { type: 'LineString', coordinates: [...coordinates] },
  };
};

const normalizedHeading = value => (
  Number.isFinite(value) ? ((value % 360) + 360) % 360 : null
);

export const headingDifferenceDeg = (a, b) => {
  const first = normalizedHeading(a);
  const second = normalizedHeading(b);
  if (first == null || second == null) return null;
  const difference = Math.abs(first - second);
  return Math.min(difference, 360 - difference);
};

export const bearingBetween = (from, to) => {
  if (!from || !to) return null;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const deltaLng = (to.lng - from.lng) * Math.PI / 180;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return normalizedHeading(Math.atan2(y, x) * 180 / Math.PI);
};

export const projectPositionOntoRoute = (
  route,
  position,
  {
    previousDistanceAlongKm = null,
    maxBacktrackKm = 0.04,
    maxAdvanceKm = null,
    progressPreferenceSlackM = 20,
    headingDeg = null,
    headingPreferenceSlackM = 18,
    headingPenaltyM = 36,
  } = {},
) => {
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
    segmentIndex: 0,
    segmentBearingDeg: null,
    headingDifferenceDeg: null,
  };
  let bestPreferred = null;

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
    const segmentBearingDeg = bearingBetween(start, end);
    const headingDelta = headingDifferenceDeg(headingDeg, segmentBearingDeg);
    const headingCostM = headingDelta == null
      ? 0
      : Math.min(1, headingDelta / 90) * headingPenaltyM;

    const candidate = {
      distanceToRouteM: distanceM,
      distanceAlongKm: cumulativeKm + segmentKm * t,
      segmentIndex: index,
      segmentBearingDeg,
      headingDifferenceDeg: headingDelta,
      matchScoreM: distanceM + headingCostM,
    };
    if (distanceM < best.distanceToRouteM) best = candidate;
    if (
      (
        !Number.isFinite(previousDistanceAlongKm)
        || candidate.distanceAlongKm >= previousDistanceAlongKm - maxBacktrackKm
      )
      && (
        !Number.isFinite(maxAdvanceKm)
        || candidate.distanceAlongKm <= maxAdvanceKm
      )
      && (!bestPreferred || candidate.matchScoreM < bestPreferred.matchScoreM)
    ) {
      bestPreferred = candidate;
    }
    cumulativeKm += segmentKm;
  }

  const preferenceSlackM = progressPreferenceSlackM
    + (normalizedHeading(headingDeg) == null ? 0 : headingPreferenceSlackM);
  if (
    bestPreferred
    && bestPreferred.distanceToRouteM <= best.distanceToRouteM + preferenceSlackM
  ) {
    best = bestPreferred;
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

export const upcomingRouteManeuvers = (
  route,
  distanceAlongKm = 0,
  maxResults = 5,
) => {
  const maneuvers = route?.maneuvers ?? [];
  const thresholdKm = Math.max(0, distanceAlongKm - 0.005);

  return maneuvers
    .filter(maneuver => (
      maneuver.kind === 'depart'
        ? distanceAlongKm <= 0.005
        : maneuver.distanceAlongKm >= thresholdKm
    ))
    .map(maneuver => ({
      ...maneuver,
      distanceAheadKm: Math.max(0, maneuver.distanceAlongKm - distanceAlongKm),
    }))
    .slice(0, Math.max(0, maxResults));
};

export const remainingDurationMin = (route, remainingKm, speedMps = null) => {
  if (!route?.distanceKm || !route?.durationMin) return 0;
  const profileEstimate = route.durationMin * remainingKm / route.distanceKm;
  if (!Number.isFinite(speedMps) || speedMps <= 0) {
    return Math.max(0, Math.ceil(profileEstimate));
  }

  const liveEstimate = remainingKm / (speedMps * 3.6) * 60;
  const blendedEstimate = liveEstimate * 0.65 + profileEstimate * 0.35;
  return Math.max(0, Math.ceil(blendedEstimate));
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
