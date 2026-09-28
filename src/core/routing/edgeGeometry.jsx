import { haversineKm } from "../utils/geo.jsx";

export const coordinatePoint = ([lng, lat]) => ({ lng, lat });

const sameCoordinate = (a, b) => (
  Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7
);

// Stored edge geometry includes both endpoints, in travel order. Older packs
// omit it because each source coordinate is already a graph node.
export const normalizeEdgeGeometry = (geometry, fromNode, toNode) => {
  const coordinates = geometry?.type === 'LineString' ? geometry.coordinates : null;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  if (coordinates.some(point => (
    !Array.isArray(point) || point.length < 2
    || !Number.isFinite(point[0]) || !Number.isFinite(point[1])
    || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90
  ))) return null;

  let points = coordinates.map(([lng, lat]) => [lng, lat]);
  const from = [fromNode.lng, fromNode.lat];
  const to = [toNode.lng, toNode.lat];
  if (sameCoordinate(points[0], to) && sameCoordinate(points.at(-1), from)) {
    points.reverse();
  }
  if (!sameCoordinate(points[0], from) || !sameCoordinate(points.at(-1), to)) return null;
  points[0] = from;
  points[points.length - 1] = to;
  points = points.filter((point, index) => index === 0 || !sameCoordinate(point, points[index - 1]));
  return points.length >= 2 ? { type: 'LineString', coordinates: points } : null;
};

export const edgeCoordinates = (edge, fromNode, toNode) => (
  edge?.geometry?.coordinates ?? [[fromNode.lng, fromNode.lat], [toNode.lng, toNode.lat]]
);

export const geometryDistances = coordinates => {
  const cumulative = [0];
  for (let index = 1; index < coordinates.length; index += 1) {
    cumulative.push(cumulative[index - 1] + haversineKm(
      coordinatePoint(coordinates[index - 1]), coordinatePoint(coordinates[index]),
    ));
  }
  return cumulative;
};

export const sliceEdgeGeometry = (geometry, startFraction, endFraction) => {
  if (!geometry) return undefined;
  const points = geometry.coordinates;
  const cumulative = geometryDistances(points);
  const total = cumulative.at(-1);
  const start = Math.max(0, Math.min(1, startFraction)) * total;
  const end = Math.max(start, Math.min(1, endFraction) * total);
  const pointAt = distance => {
    for (let index = 1; index < points.length; index += 1) {
      if (cumulative[index] < distance) continue;
      const length = cumulative[index] - cumulative[index - 1];
      const fraction = length > 0 ? (distance - cumulative[index - 1]) / length : 0;
      return points[index - 1].map((value, axis) => (
        value + (points[index][axis] - value) * fraction
      ));
    }
    return points.at(-1);
  };
  return {
    type: 'LineString',
    coordinates: [
      pointAt(start),
      ...points.filter((_, index) => cumulative[index] > start && cumulative[index] < end),
      pointAt(end),
    ],
  };
};
