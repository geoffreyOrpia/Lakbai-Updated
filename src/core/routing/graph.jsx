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
