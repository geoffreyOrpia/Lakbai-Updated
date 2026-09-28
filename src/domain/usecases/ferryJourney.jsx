import { haversineKm } from "../../core/utils/geo.jsx";
import { routingRegionFor } from "../../data/assets/routingRegionAssets.jsx";
import { ferryConnectionForRegions } from "../../data/assets/ferryConnections.jsx";
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

const offsetManeuvers = (maneuvers, offsetKm, { dropDepart = false, dropArrive = false } = {}) => (
  (maneuvers ?? [])
    .filter(maneuver => !(dropDepart && maneuver.kind === 'depart'))
    .filter(maneuver => !(dropArrive && maneuver.kind === 'arrive'))
    .map(maneuver => ({
      ...maneuver,
      distanceAlongKm: maneuver.distanceAlongKm + offsetKm,
    }))
);

export const calculateOfflineFerryJourney = async ({
  routingGraphRepository,
  from,
  to,
  mode = 'walk',
  preference = 'direct',
  routeAttractors = [],
  maxSnapDistanceKm = 1,
  targetLabel = 'destination',
  initialTurnState = [],
}) => {
  const originRegion = routingRegionFor(null, from);
  const targetRegion = routingRegionFor(null, to);
  if (!originRegion || !targetRegion) return { ok: false, reason: 'outside-coverage' };
  if (originRegion === targetRegion) return { ok: false, reason: 'ferry-not-required' };

  const connection = ferryConnectionForRegions(originRegion, targetRegion, mode);
  if (!connection || connection.verificationStatus !== 'source-reviewed-device-pending') {
    return { ok: false, reason: 'ferry-unavailable' };
  }

  const originTerminal = connection.terminals[originRegion];
  const targetTerminal = connection.terminals[targetRegion];
  const originGraph = await routingGraphRepository.getForRegion(originRegion);
  if (!originGraph) return { ok: false, reason: 'origin-routing-unavailable' };

  const originRoute = calculateOfflineRoute({
    graph: originGraph,
    from,
    to: originTerminal,
    mode,
    preference,
    routeAttractors,
    maxSnapDistanceKm,
    targetLabel: originTerminal.name,
    initialTurnState,
  });
  if (!originRoute.ok) {
    return {
      ok: false,
      reason: 'ferry-origin-route-failed',
      routeReason: originRoute.reason,
    };
  }

  const targetGraph = await routingGraphRepository.getForRegion(targetRegion);
  if (!targetGraph) return { ok: false, reason: 'target-routing-unavailable' };
  const destinationRoute = calculateOfflineRoute({
    graph: targetGraph,
    from: targetTerminal,
    to,
    mode,
    preference,
    routeAttractors,
    maxSnapDistanceKm,
    targetLabel,
  });
  if (!destinationRoute.ok) {
    return {
      ok: false,
      reason: 'ferry-destination-route-failed',
      routeReason: destinationRoute.reason,
    };
  }

  const ferryGeometry = originRegion === 'mainland'
    ? connection.geometry
    : {
      type: 'LineString',
      coordinates: [...connection.geometry.coordinates].reverse(),
    };
  const ferryDistanceKm = haversineKm(originTerminal, targetTerminal);
  const ferryDurationMin = Number.isFinite(connection.crossingDurationMin)
    ? connection.crossingDurationMin
    : null;
  const ferryStartKm = originRoute.distanceKm;
  const ferryEndKm = ferryStartKm + ferryDistanceKm;
  const totalDistanceKm = ferryEndKm + destinationRoute.distanceKm;
  const coordinates = [];
  appendCoordinates(coordinates, originRoute.geometry.coordinates);
  appendCoordinates(coordinates, ferryGeometry.coordinates);
  appendCoordinates(coordinates, destinationRoute.geometry.coordinates);

  const maneuvers = [
    ...offsetManeuvers(originRoute.maneuvers, 0, { dropArrive: true }),
    {
      id: 'ferry-board',
      kind: 'ferry-board',
      instruction: `Board the ferry at ${originTerminal.name}`,
      streetName: null,
      distanceAlongKm: ferryStartKm,
      location: { lat: originTerminal.lat, lng: originTerminal.lng },
    },
    {
      id: 'ferry-arrive',
      kind: 'ferry-arrive',
      instruction: `Arrive at ${targetTerminal.name} and resume road navigation`,
      streetName: null,
      distanceAlongKm: ferryEndKm,
      location: { lat: targetTerminal.lat, lng: targetTerminal.lng },
    },
    ...offsetManeuvers(destinationRoute.maneuvers, ferryEndKm, { dropDepart: true }),
  ];

  return {
    ok: true,
    type: 'ferry-journey',
    mode,
    preference,
    originRegion,
    targetRegion,
    connection,
    geometry: { type: 'LineString', coordinates },
    maneuvers,
    distanceKm: totalDistanceKm,
    durationMin: originRoute.durationMin
      + destinationRoute.durationMin
      + (ferryDurationMin ?? 0),
    roadDurationMin: originRoute.durationMin + destinationRoute.durationMin,
    ferryDurationMin,
    queueDurationMin: null,
    totalDurationKnown: false,
    ferryLeg: {
      startKm: ferryStartKm,
      endKm: ferryEndKm,
      distanceKm: ferryDistanceKm,
      geometry: ferryGeometry,
      originTerminal,
      targetTerminal,
    },
    legs: [{
      kind: 'road',
      region: originRegion,
      startKm: 0,
      endKm: ferryStartKm,
      route: originRoute,
    }, {
      kind: 'ferry',
      startKm: ferryStartKm,
      endKm: ferryEndKm,
      distanceKm: ferryDistanceKm,
      connection,
    }, {
      kind: 'road',
      region: targetRegion,
      startKm: ferryEndKm,
      endKm: totalDistanceKm,
      route: destinationRoute,
    }],
  };
};

export const remainingFerryJourneyDurationMin = (route, distanceAlongKm = 0) => {
  if (route?.type !== 'ferry-journey') return null;
  let remainingMin = 0;
  for (const leg of route.legs ?? []) {
    const durationMin = leg.kind === 'ferry'
      ? route.ferryDurationMin
      : leg.route?.durationMin;
    if (!Number.isFinite(durationMin)) continue;
    if (distanceAlongKm <= leg.startKm) {
      remainingMin += durationMin;
      continue;
    }
    if (distanceAlongKm >= leg.endKm) continue;
    const legDistanceKm = Math.max(0.001, leg.endKm - leg.startKm);
    const remainingRatio = Math.max(0, Math.min(
      1,
      (leg.endKm - distanceAlongKm) / legDistanceKm,
    ));
    remainingMin += durationMin * remainingRatio;
  }
  return Math.max(0, Math.ceil(remainingMin));
};

export const isOnFerryLeg = (route, distanceAlongKm) => (
  route?.type === 'ferry-journey'
  && Number.isFinite(route.ferryLeg?.startKm)
  && Number.isFinite(route.ferryLeg?.endKm)
  && distanceAlongKm >= route.ferryLeg.startKm - 0.03
  && distanceAlongKm <= route.ferryLeg.endKm + 0.03
);
