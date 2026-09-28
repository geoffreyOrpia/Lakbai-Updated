import {
  projectOntoTrail,
  totalDistanceKm,
  trailCoordinates,
} from "../../core/utils/geo.jsx";
import { calculateOfflineRoute } from "./offlineNavigation.jsx";

const appendCoordinates = (target, source) => {
  for (const coordinate of source ?? []) {
    const previous = target[target.length - 1];
    if (
      previous
      && Math.abs(previous[0] - coordinate[0]) < 1e-9
      && Math.abs(previous[1] - coordinate[1]) < 1e-9
    ) continue;
    target.push(coordinate);
  }
};

const offsetRoadManeuvers = (maneuvers, offsetKm = 0) => (
  (maneuvers ?? [])
    .filter(maneuver => maneuver.kind !== 'arrive')
    .map(maneuver => ({
      ...maneuver,
      distanceAlongKm: maneuver.distanceAlongKm + offsetKm,
    }))
);

const trailWaypointManeuvers = (trail, trailStartKm, trailDistanceKm) => (
  (trail.waypoints ?? [])
    .filter(waypoint => waypoint.type !== 'start' && waypoint.type !== 'end')
    .map(waypoint => {
      const projection = projectOntoTrail(trail, waypoint);
      return {
        id: `trail-waypoint-${waypoint.id}`,
        kind: 'trail-waypoint',
        instruction: waypoint.name,
        streetName: null,
        distanceAlongKm: trailStartKm + projection.progress * trailDistanceKm,
        location: { lat: waypoint.lat, lng: waypoint.lng },
        note: waypoint.note ?? null,
      };
    })
);

export const calculateOfflineRoadTrailJourney = ({
  graph,
  from,
  trail,
  mode = 'walk',
  preference = 'direct',
  routeAttractors = [],
  maxSnapDistanceKm = 1,
  initialTurnState = [],
}) => {
  if (!trail?.routeVerified || !trail?.geometry?.coordinates?.length) {
    return { ok: false, reason: 'trail-unverified' };
  }
  if (mode !== 'walk') return { ok: false, reason: 'trail-walk-only' };

  const trailPoints = trailCoordinates(trail);
  const trailStart = trail.start ?? trailPoints[0];
  const trailEnd = trailPoints.at(-1);
  const trailDistanceKm = totalDistanceKm(trailPoints);
  const roadRoute = calculateOfflineRoute({
    graph,
    from,
    to: trailStart,
    mode: 'walk',
    preference,
    routeAttractors,
    maxSnapDistanceKm,
    targetLabel: trailStart.name ?? trail.name,
    initialTurnState,
  });
  if (!roadRoute.ok) {
    return {
      ok: false,
      reason: 'trail-approach-route-failed',
      routeReason: roadRoute.reason,
    };
  }

  const roadEndKm = roadRoute.distanceKm;
  const totalDistanceKmValue = roadEndKm + trailDistanceKm;
  const geometryCoordinates = [];
  appendCoordinates(geometryCoordinates, roadRoute.geometry.coordinates);
  appendCoordinates(geometryCoordinates, trail.geometry.coordinates);

  const maneuvers = [
    ...offsetRoadManeuvers(roadRoute.maneuvers),
    {
      id: 'trail-enter',
      kind: 'trail-enter',
      instruction: `Continue onto the verified trail: ${trail.name}`,
      streetName: null,
      distanceAlongKm: roadEndKm,
      location: { lat: trailStart.lat, lng: trailStart.lng },
    },
    ...trailWaypointManeuvers(trail, roadEndKm, trailDistanceKm),
    {
      id: 'trail-arrive',
      kind: 'arrive',
      instruction: `Arrive at the end of ${trail.name}`,
      streetName: null,
      distanceAlongKm: totalDistanceKmValue,
      location: { lat: trailEnd.lat, lng: trailEnd.lng },
    },
  ];

  return {
    ok: true,
    type: 'road-trail-journey',
    mode: 'walk',
    preference: roadRoute.preference,
    routingPolicy: roadRoute.routingPolicy,
    scenicAnchorCount: roadRoute.scenicAnchorCount,
    initialTurnState: roadRoute.initialTurnState,
    startSnap: roadRoute.startSnap,
    endSnap: roadRoute.endSnap,
    geometry: { type: 'LineString', coordinates: geometryCoordinates },
    maneuvers,
    distanceKm: totalDistanceKmValue,
    durationMin: roadRoute.durationMin + (trail.durationMin ?? 0),
    finalTarget: {
      label: trail.waypoints?.find(waypoint => waypoint.type === 'end')?.name
        ?? `${trail.name} end`,
      lat: trailEnd.lat,
      lng: trailEnd.lng,
    },
    trail,
    trailLeg: {
      startKm: roadEndKm,
      endKm: totalDistanceKmValue,
      distanceKm: trailDistanceKm,
      durationMin: trail.durationMin ?? 0,
      geometry: trail.geometry,
      start: trailStart,
      end: trailEnd,
    },
    legs: [{
      kind: 'road',
      startKm: 0,
      endKm: roadEndKm,
      route: roadRoute,
    }, {
      kind: 'trail',
      startKm: roadEndKm,
      endKm: totalDistanceKmValue,
      trail,
    }],
  };
};

export const isOnTrailLeg = (route, distanceAlongKm) => (
  route?.type === 'road-trail-journey'
  && Number.isFinite(route.trailLeg?.startKm)
  && Number.isFinite(route.trailLeg?.endKm)
  && distanceAlongKm >= route.trailLeg.startKm - 0.02
);

export const remainingRoadTrailDurationMin = (
  route,
  distanceAlongKm = 0,
  liveRoadSpeedMps = null,
) => {
  if (route?.type !== 'road-trail-journey') return null;
  const roadLeg = route.legs?.find(leg => leg.kind === 'road');
  const trailLeg = route.trailLeg;
  let remainingMin = 0;

  if (roadLeg && distanceAlongKm < roadLeg.endKm) {
    const roadRemainingKm = roadLeg.endKm - distanceAlongKm;
    remainingMin += Number.isFinite(liveRoadSpeedMps) && liveRoadSpeedMps > 0
      ? roadRemainingKm * 1000 / liveRoadSpeedMps / 60
      : (roadLeg.route.durationMin ?? 0)
        * Math.max(0, roadRemainingKm / Math.max(0.001, roadLeg.endKm - roadLeg.startKm));
    remainingMin += trailLeg?.durationMin ?? 0;
  } else if (trailLeg && distanceAlongKm < trailLeg.endKm) {
    const remainingRatio = Math.max(
      0,
      (trailLeg.endKm - distanceAlongKm) / Math.max(0.001, trailLeg.distanceKm),
    );
    remainingMin += (trailLeg.durationMin ?? 0) * remainingRatio;
  }

  return Math.max(0, Math.ceil(remainingMin));
};
