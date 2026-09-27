import { aStarRoute } from "../../core/routing/aStar.jsx";
import {
  buildRoutingIndex,
  edgeSupportsMode,
  nearestGraphEdge,
} from "../../core/routing/graph.jsx";
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

const samePhysicalEdge = (candidate, reference) => {
  if (!candidate || !reference) return false;
  if (candidate.osmId && reference.osmId) return candidate.osmId === reference.osmId;
  return candidate.highway === reference.highway && candidate.name === reference.name;
};

const matchingDirectedEdge = (index, fromId, toId, reference, mode) => {
  const candidates = (index.adjacency.get(String(fromId)) ?? [])
    .filter(edge => String(edge.to) === String(toId) && edgeSupportsMode(edge, mode));
  return candidates.find(edge => samePhysicalEdge(edge, reference)) ?? candidates[0] ?? null;
};

const partialEdge = (edge, from, to, fraction) => ({
  ...edge,
  from,
  to,
  distanceKm: Math.max(0, (edge.distanceKm ?? 0) * fraction),
  virtual: true,
});

const alignedFraction = (referenceSnap, snap) => {
  const sameDirection = String(referenceSnap.edge.from) === String(snap.edge.from)
    && String(referenceSnap.edge.to) === String(snap.edge.to);
  if (sameDirection) return snap.fraction;
  const reversed = String(referenceSnap.edge.from) === String(snap.edge.to)
    && String(referenceSnap.edge.to) === String(snap.edge.from);
  return reversed ? 1 - snap.fraction : null;
};

const SNAP_ENDPOINT_EPSILON = 1e-6;

const endpointNodeId = snap => {
  if (snap.fraction <= SNAP_ENDPOINT_EPSILON) return String(snap.edge.from);
  if (snap.fraction >= 1 - SNAP_ENDPOINT_EPSILON) return String(snap.edge.to);
  return null;
};

const createSnappedRoutingIndex = (index, startSnap, endSnap, mode) => {
  const snappedStartNodeId = endpointNodeId(startSnap);
  const snappedEndNodeId = endpointNodeId(endSnap);
  const startId = snappedStartNodeId ?? '__lakbai_route_start__';
  const endId = snappedEndNodeId ?? '__lakbai_route_end__';
  const nodesById = new Map(index.nodesById);
  const adjacency = new Map(index.adjacency);

  if (!snappedStartNodeId) {
    nodesById.set(startId, { id: startId, ...startSnap.projected });
    adjacency.set(startId, []);
  }
  if (!snappedEndNodeId) {
    nodesById.set(endId, { id: endId, ...endSnap.projected });
    adjacency.set(endId, []);
  }

  const appendEdge = (fromId, edge) => {
    const key = String(fromId);
    adjacency.set(key, [...(adjacency.get(key) ?? []), edge]);
  };

  const startForward = !snappedStartNodeId
    ? matchingDirectedEdge(
      index,
      startSnap.edge.from,
      startSnap.edge.to,
      startSnap.edge,
      mode,
    )
    : null;
  const startReverse = !snappedStartNodeId
    ? matchingDirectedEdge(
      index,
      startSnap.edge.to,
      startSnap.edge.from,
      startSnap.edge,
      mode,
    )
    : null;
  if (!snappedStartNodeId) {
    if (startForward) {
      appendEdge(startId, partialEdge(
        startForward,
        startId,
        String(startSnap.edge.to),
        1 - startSnap.fraction,
      ));
    }
    if (startReverse) {
      appendEdge(startId, partialEdge(
        startReverse,
        startId,
        String(startSnap.edge.from),
        startSnap.fraction,
      ));
    }
  }

  const endForward = !snappedEndNodeId
    ? matchingDirectedEdge(
      index,
      endSnap.edge.from,
      endSnap.edge.to,
      endSnap.edge,
      mode,
    )
    : null;
  const endReverse = !snappedEndNodeId
    ? matchingDirectedEdge(
      index,
      endSnap.edge.to,
      endSnap.edge.from,
      endSnap.edge,
      mode,
    )
    : null;
  if (!snappedEndNodeId) {
    if (endForward) {
      appendEdge(
        String(endSnap.edge.from),
        partialEdge(endForward, String(endSnap.edge.from), endId, endSnap.fraction),
      );
    }
    if (endReverse) {
      appendEdge(
        String(endSnap.edge.to),
        partialEdge(endReverse, String(endSnap.edge.to), endId, 1 - endSnap.fraction),
      );
    }
  }

  const endFraction = alignedFraction(startSnap, endSnap);
  const sameSegment = !snappedStartNodeId
    && !snappedEndNodeId
    && endFraction != null
    && samePhysicalEdge(startSnap.edge, endSnap.edge);
  if (sameSegment) {
    if (endFraction >= startSnap.fraction && startForward) {
      appendEdge(startId, partialEdge(
        startForward,
        startId,
        endId,
        endFraction - startSnap.fraction,
      ));
    } else if (endFraction < startSnap.fraction && startReverse) {
      appendEdge(startId, partialEdge(
        startReverse,
        startId,
        endId,
        startSnap.fraction - endFraction,
      ));
    }
  }

  return {
    index: {
      ...index,
      nodesById,
      adjacency,
    },
    startId,
    endId,
  };
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
  const startSnap = nearestGraphEdge(index, from, mode, maxSnapDistanceKm);
  const endSnap = nearestGraphEdge(index, to, mode, maxSnapDistanceKm);

  if (!startSnap || !endSnap) {
    return {
      ok: false,
      reason: 'outside-coverage',
      startSnap,
      endSnap,
    };
  }

  const snapped = createSnappedRoutingIndex(index, startSnap, endSnap, mode);
  const path = aStarRoute(snapped.index, snapped.startId, snapped.endId, mode);
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
    geometry: routeGeometryFromPath(snapped.index, path),
    maneuvers: buildRouteManeuvers(snapped.index, path, targetLabel),
    distanceKm: summary.distanceKm,
    durationMin: summary.durationMin,
  };
};
