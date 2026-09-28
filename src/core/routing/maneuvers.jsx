import { haversineKm } from "../utils/geo.jsx";
import { coordinatePoint, edgeCoordinates } from "./edgeGeometry.jsx";

const toRad = value => value * Math.PI / 180;
const toDeg = value => value * 180 / Math.PI;

export const bearingDegrees = (from, to) => {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

export const signedBearingDelta = (fromBearing, toBearing) => (
  (toBearing - fromBearing + 540) % 360 - 180
);

export const classifyTurn = delta => {
  const magnitude = Math.abs(delta);
  if (magnitude < 20) return 'continue';
  if (magnitude >= 160) return 'uturn';
  if (magnitude < 50) return delta > 0 ? 'slight-right' : 'slight-left';
  if (magnitude < 125) return delta > 0 ? 'right' : 'left';
  return delta > 0 ? 'sharp-right' : 'sharp-left';
};

const instructionFor = (kind, streetName) => {
  const suffix = streetName ? ` onto ${streetName}` : '';
  switch (kind) {
    case 'continue':
      return streetName ? `Continue onto ${streetName}` : 'Continue straight';
    case 'slight-right':
      return `Keep slightly right${suffix}`;
    case 'slight-left':
      return `Keep slightly left${suffix}`;
    case 'right':
      return `Turn right${suffix}`;
    case 'left':
      return `Turn left${suffix}`;
    case 'sharp-right':
      return `Make a sharp right${suffix}`;
    case 'sharp-left':
      return `Make a sharp left${suffix}`;
    case 'uturn':
      return `Make a U-turn${suffix}`;
    default:
      return 'Continue';
  }
};

const normalizedName = edge => edge?.name?.trim() || null;

export const buildRouteManeuvers = (index, path, targetLabel = 'destination') => {
  if (!path?.nodeIds?.length) return [];
  const firstEdge = path.edges[0];
  const firstName = normalizedName(firstEdge);
  const maneuvers = [{
    id: 'depart',
    kind: 'depart',
    instruction: firstName ? `Start on ${firstName}` : 'Start on the mapped route',
    streetName: firstName,
    distanceAlongKm: 0,
  }];

  let cumulativeKm = 0;
  let previousAddedAtKm = -1;

  for (let indexInPath = 1; indexInPath < path.nodeIds.length - 1; indexInPath += 1) {
    const previousEdge = path.edges[indexInPath - 1];
    const nextEdge = path.edges[indexInPath];
    cumulativeKm += previousEdge?.distanceKm ?? 0;

    const previousNode = index.nodesById.get(String(path.nodeIds[indexInPath - 1]));
    const junctionNode = index.nodesById.get(String(path.nodeIds[indexInPath]));
    const nextNode = index.nodesById.get(String(path.nodeIds[indexInPath + 1]));
    if (!previousNode || !junctionNode || !nextNode || !nextEdge) continue;

    const incoming = edgeCoordinates(previousEdge, previousNode, junctionNode);
    const outgoing = edgeCoordinates(nextEdge, junctionNode, nextNode);
    const previousBearing = bearingDegrees(coordinatePoint(incoming.at(-2)), junctionNode);
    const nextBearing = bearingDegrees(junctionNode, coordinatePoint(outgoing[1]));
    const delta = signedBearingDelta(previousBearing, nextBearing);
    const previousName = normalizedName(previousEdge);
    const nextName = normalizedName(nextEdge);
    const nameChanged = Boolean(nextName && nextName !== previousName);
    const significantTurn = Math.abs(delta) >= (nameChanged ? 25 : 55);

    if (!nameChanged && !significantTurn) continue;
    if (previousAddedAtKm >= 0 && cumulativeKm - previousAddedAtKm < 0.015 && !significantTurn) continue;

    const kind = classifyTurn(delta);
    maneuvers.push({
      id: `maneuver-${indexInPath}`,
      kind,
      instruction: instructionFor(kind, nextName),
      streetName: nextName,
      distanceAlongKm: cumulativeKm,
      turnDegrees: delta,
      location: {
        lat: junctionNode.lat,
        lng: junctionNode.lng,
      },
    });
    previousAddedAtKm = cumulativeKm;
  }

  const totalDistanceKm = path.edges.reduce((sum, edge) => sum + (edge.distanceKm ?? 0), 0);
  const finalNode = index.nodesById.get(String(path.nodeIds[path.nodeIds.length - 1]));
  maneuvers.push({
    id: 'arrive',
    kind: 'arrive',
    instruction: `Arrive at ${targetLabel}`,
    streetName: null,
    distanceAlongKm: totalDistanceKm,
    location: finalNode ? {
      lat: finalNode.lat,
      lng: finalNode.lng,
    } : null,
  });

  return maneuvers;
};

export const straightLineDistanceToManeuverKm = (position, maneuver) => {
  if (!maneuver?.location) return null;
  return haversineKm(position, maneuver.location);
};
