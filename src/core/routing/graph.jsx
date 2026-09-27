import { haversineKm } from "../utils/geo.jsx";

const SPATIAL_CELL_DEGREES = 0.0025;

const spatialCellKey = (lngIndex, latIndex) => `${lngIndex}:${latIndex}`;

const cellRangeForBounds = (west, south, east, north) => {
  const minLng = Math.floor(west / SPATIAL_CELL_DEGREES);
  const maxLng = Math.floor(east / SPATIAL_CELL_DEGREES);
  const minLat = Math.floor(south / SPATIAL_CELL_DEGREES);
  const maxLat = Math.floor(north / SPATIAL_CELL_DEGREES);
  const keys = [];
  for (let lngIndex = minLng; lngIndex <= maxLng; lngIndex += 1) {
    for (let latIndex = minLat; latIndex <= maxLat; latIndex += 1) {
      keys.push(spatialCellKey(lngIndex, latIndex));
    }
  }
  return keys;
};

const addEdgeToSpatialIndex = (spatialIndex, edge, fromNode, toNode) => {
  const west = Math.min(fromNode.lng, toNode.lng);
  const east = Math.max(fromNode.lng, toNode.lng);
  const south = Math.min(fromNode.lat, toNode.lat);
  const north = Math.max(fromNode.lat, toNode.lat);

  for (const key of cellRangeForBounds(west, south, east, north)) {
    const bucket = spatialIndex.get(key) ?? [];
    bucket.push(edge);
    spatialIndex.set(key, bucket);
  }
};

export const buildRoutingIndex = graph => {
  const nodesById = new Map();
  const adjacency = new Map();
  const modeNodes = {
    walk: new Set(),
    drive: new Set(),
  };
  const edgeSpatialIndex = {
    walk: new Map(),
    drive: new Map(),
  };

  for (const node of graph.nodes ?? []) {
    nodesById.set(String(node.id), node);
    adjacency.set(String(node.id), []);
  }

  for (const edge of graph.edges ?? []) {
    const from = String(edge.from);
    const to = String(edge.to);
    if (!nodesById.has(from) || !nodesById.has(to)) continue;
    if (!adjacency.has(from)) adjacency.set(from, []);
    const normalized = {
      ...edge,
      from,
      to,
    };
    adjacency.get(from).push(normalized);
    const fromNode = nodesById.get(from);
    const toNode = nodesById.get(to);
    if (edgeSupportsMode(normalized, 'walk')) {
      modeNodes.walk.add(from);
      modeNodes.walk.add(to);
      addEdgeToSpatialIndex(edgeSpatialIndex.walk, normalized, fromNode, toNode);
    }
    if (edgeSupportsMode(normalized, 'drive')) {
      modeNodes.drive.add(from);
      modeNodes.drive.add(to);
      addEdgeToSpatialIndex(edgeSpatialIndex.drive, normalized, fromNode, toNode);
    }
  }

  return {
    graph,
    nodesById,
    adjacency,
    modeNodes,
    edgeSpatialIndex,
  };
};

export const edgeSupportsMode = (edge, mode) => {
  if (mode === 'drive') return edge.drive !== false;
  return edge.walk !== false;
};

const projectOntoSegment = (position, fromNode, toNode) => {
  const earthRadiusKm = 6371;
  const metersPerDegreeLat = Math.PI * earthRadiusKm * 1000 / 180;
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos(position.lat * Math.PI / 180);
  const toLocal = point => ({
    x: (point.lng - position.lng) * metersPerDegreeLng,
    y: (point.lat - position.lat) * metersPerDegreeLat,
  });
  const a = toLocal(fromNode);
  const b = toLocal(toNode);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const fraction = lengthSquared > 0
    ? Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSquared))
    : 0;
  const projectedX = a.x + fraction * dx;
  const projectedY = a.y + fraction * dy;

  return {
    fraction,
    distanceKm: Math.hypot(projectedX, projectedY) / 1000,
    projected: {
      lat: fromNode.lat + (toNode.lat - fromNode.lat) * fraction,
      lng: fromNode.lng + (toNode.lng - fromNode.lng) * fraction,
    },
  };
};

const nearbyEdges = (index, position, mode, maxDistanceKm) => {
  const spatialIndex = index.edgeSpatialIndex?.[mode];
  if (!spatialIndex) {
    return Array.from(index.adjacency.values()).flat();
  }

  const latRadius = maxDistanceKm / 110;
  const latitudeCosine = Math.max(0.01, Math.cos(position.lat * Math.PI / 180));
  const lngRadius = maxDistanceKm / (110 * latitudeCosine);
  const keys = cellRangeForBounds(
    position.lng - lngRadius,
    position.lat - latRadius,
    position.lng + lngRadius,
    position.lat + latRadius,
  );
  const candidates = new Set();
  for (const key of keys) {
    for (const edge of spatialIndex.get(key) ?? []) candidates.add(edge);
  }
  return candidates;
};

export const nearestGraphEdge = (index, position, mode = 'walk', maxDistanceKm = 1.5) => {
  let best = null;

  for (const edge of nearbyEdges(index, position, mode, maxDistanceKm)) {
    if (!edgeSupportsMode(edge, mode)) continue;
    const fromNode = index.nodesById.get(String(edge.from));
    const toNode = index.nodesById.get(String(edge.to));
    if (!fromNode || !toNode) continue;

    const projection = projectOntoSegment(position, fromNode, toNode);
    if (!best || projection.distanceKm < best.distanceKm) {
      best = {
        edge,
        fromNode,
        toNode,
        fraction: projection.fraction,
        projected: projection.projected,
        distanceKm: projection.distanceKm,
      };
    }
  }

  return best && best.distanceKm <= maxDistanceKm ? best : null;
};

export const nearestGraphNode = (index, position, mode = 'walk', maxDistanceKm = 1.5) => {
  let best = null;
  const candidates = index.modeNodes?.[mode] ?? new Set(index.nodesById.keys());

  for (const id of candidates) {
    const node = index.nodesById.get(id);
    if (!node) continue;
    const distanceKm = haversineKm(position, node);
    if (!best || distanceKm < best.distanceKm) {
      best = {
        id,
        node,
        distanceKm,
      };
    }
  }

  return best && best.distanceKm <= maxDistanceKm ? best : null;
};

export const routeBounds = geometry => {
  const coordinates = geometry?.coordinates ?? [];
  if (!coordinates.length) return null;
  const lngs = coordinates.map(([lng]) => lng);
  const lats = coordinates.map(([, lat]) => lat);
  return [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats),
  ];
};
