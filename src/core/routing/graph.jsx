import { haversineKm } from "../utils/geo.jsx";

export const buildRoutingIndex = graph => {
  const nodesById = new Map();
  const adjacency = new Map();
  const modeNodes = {
    walk: new Set(),
    drive: new Set(),
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
    if (edgeSupportsMode(normalized, 'walk')) {
      modeNodes.walk.add(from);
      modeNodes.walk.add(to);
    }
    if (edgeSupportsMode(normalized, 'drive')) {
      modeNodes.drive.add(from);
      modeNodes.drive.add(to);
    }
  }

  return {
    graph,
    nodesById,
    adjacency,
    modeNodes,
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

export const nearestGraphEdge = (index, position, mode = 'walk', maxDistanceKm = 1.5) => {
  let best = null;

  for (const [fromId, edges] of index.adjacency.entries()) {
    const fromNode = index.nodesById.get(fromId);
    if (!fromNode) continue;

    for (const edge of edges) {
      if (!edgeSupportsMode(edge, mode)) continue;
      const toNode = index.nodesById.get(String(edge.to));
      if (!toNode) continue;

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
