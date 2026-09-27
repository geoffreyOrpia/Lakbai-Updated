import { aStarRoute } from "../../core/routing/aStar.jsx";
import { buildRoutingIndex, nearestGraphNode } from "../../core/routing/graph.jsx";
import { routeGeometryFromPath, summarizeRoutePath } from "../../core/routing/routeGeometry.jsx";
import { buildRouteManeuvers } from "../../core/routing/maneuvers.jsx";

const indexCache = new WeakMap();

const routingIndexFor = graph => {
  let index = indexCache.get(graph);
  if (!index) {
    index = buildRoutingIndex(graph);
    indexCache.set(graph, index);
  }
  return index;
};

export const calculateOfflineRoute = ({
  graph,
  from,
  to,
  mode = 'walk',
  maxSnapDistanceKm = 1.5,
  targetLabel = 'destination',
}) => {
  const index = routingIndexFor(graph);
  const startSnap = nearestGraphNode(index, from, mode, maxSnapDistanceKm);
  const endSnap = nearestGraphNode(index, to, mode, maxSnapDistanceKm);

  if (!startSnap || !endSnap) {
    return {
      ok: false,
      reason: 'outside-coverage',
      startSnap,
      endSnap,
    };
  }

  const path = aStarRoute(index, startSnap.id, endSnap.id, mode);
  if (!path) {
    return {
      ok: false,
      reason: 'no-route',
      startSnap,
      endSnap,
    };
  }

  const summary = summarizeRoutePath(path, mode);
  return {
    ok: true,
    mode,
    startSnap,
    endSnap,
    nodeIds: path.nodeIds,
    edges: path.edges,
    geometry: routeGeometryFromPath(index, path),
    maneuvers: buildRouteManeuvers(index, path, targetLabel),
    distanceKm: summary.distanceKm,
    durationMin: summary.durationMin,
  };
};
