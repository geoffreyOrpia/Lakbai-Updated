import { aStarRoute } from "../../core/routing/aStar.jsx";
import { sliceEdgeGeometry } from "../../core/routing/edgeGeometry.jsx";
import {
  buildRoutingIndex,
  edgeSupportsMode,
  nearestGraphEdge,
} from "../../core/routing/graph.jsx";
import { routeGeometryFromPath, summarizeRoutePath } from "../../core/routing/routeGeometry.jsx";
import { buildRouteManeuvers } from "../../core/routing/maneuvers.jsx";
import { normalizeRoutePreference } from "../../core/routing/routingProfiles.jsx";
import { RoutingMapOverlay } from "../../core/routing/routingMapOverlay.jsx";

import { regionForPosition } from "../../core/routing/regionCoverage.jsx";

const indexCache = new WeakMap();

const routingIndexFor = graph => {
  let index = indexCache.get(graph);
  if (!index) {
    index = buildRoutingIndex(graph);
    indexCache.set(graph, index);
  }
  return index;
};

const scenicOsmIdsFor = (index, attractors) => {
  const scenicOsmIds = new Set();
  for (const place of attractors ?? []) {
    if (!Number.isFinite(place?.lat) || !Number.isFinite(place?.lng)) continue;
    const snap = nearestGraphEdge(index, place, 'walk', 0.35);
    const osmId = snap?.edge?.osmId;
    if (osmId) scenicOsmIds.add(String(osmId));
  }
  return scenicOsmIds;
};

const samePhysicalEdge = (candidate, reference) => {
  if (!candidate || !reference) return false;
  if (candidate.segmentId || reference.segmentId) return candidate.segmentId === reference.segmentId;
  if (candidate.osmId && reference.osmId) return candidate.osmId === reference.osmId;
  return candidate.highway === reference.highway && candidate.name === reference.name;
};

const matchingDirectedEdge = (index, fromId, toId, reference, mode) => {
  const candidates = (index.adjacency.get(String(fromId)) ?? [])
    .filter(edge => String(edge.to) === String(toId) && edgeSupportsMode(edge, mode));
  return candidates.find(edge => samePhysicalEdge(edge, reference))
    ?? (reference.segmentId ? null : candidates[0]) ?? null;
};

const partialEdge = (edge, from, to, startFraction, endFraction) => ({
  ...edge,
  from,
  to,
  distanceKm: Math.max(0, (edge.distanceKm ?? 0) * (endFraction - startFraction)),
  geometry: sliceEdgeGeometry(edge.geometry, startFraction, endFraction),
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
  const nodesById = new RoutingMapOverlay(index.nodesById);
  const adjacency = new RoutingMapOverlay(index.adjacency);

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
        startSnap.fraction,
        1,
      ));
    }
    if (startReverse) {
      appendEdge(startId, partialEdge(
        startReverse,
        startId,
        String(startSnap.edge.from),
        1 - startSnap.fraction,
        1,
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
        partialEdge(endForward, String(endSnap.edge.from), endId, 0, endSnap.fraction),
      );
    }
    if (endReverse) {
      appendEdge(
        String(endSnap.edge.to),
        partialEdge(endReverse, String(endSnap.edge.to), endId, 0, 1 - endSnap.fraction),
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
        startSnap.fraction,
        endFraction,
      ));
    } else if (endFraction < startSnap.fraction && startReverse) {
      appendEdge(startId, partialEdge(
        startReverse,
        startId,
        endId,
        1 - startSnap.fraction,
        1 - endFraction,
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
  preference = 'direct',
  routeAttractors = [],
  maxSnapDistanceKm = 1.5,
  targetLabel = 'destination',
}) => {
  if (graph.meta?.regionId && graph.meta?.samalBoundary) {
    const originRegion = regionForPosition(from, graph.meta);
    const targetRegion = regionForPosition(to, graph.meta);
    if (!originRegion || !targetRegion) return { ok: false, reason: 'outside-coverage' };
    if (originRegion !== graph.meta.regionId || targetRegion !== graph.meta.regionId) return { ok: false, reason: 'ferry-required' };
  }
  const normalizedPreference = mode === 'walk'
    ? normalizeRoutePreference(preference)
    : 'direct';
  const index = routingIndexFor(graph);
  const scenicOsmIds = normalizedPreference === 'scenic'
    ? scenicOsmIdsFor(index, routeAttractors)
    : new Set();
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
  const path = aStarRoute(
    snapped.index,
    snapped.startId,
    snapped.endId,
    mode,
    normalizedPreference,
    { scenicOsmIds },
  );
  if (!path) {
    return {
      ok: false,
      reason: 'no-route',
      routingPolicy: index.turnPolicy.summary,
      startSnap,
      endSnap,
    };
  }

  const summary = summarizeRoutePath(path, mode);
  return {
    ok: true,
    routingPolicy: index.turnPolicy.summary,
    mode,
    preference: normalizedPreference,
    scenicAnchorCount: scenicOsmIds.size,
    startSnap,
    endSnap,
    nodeIds: path.nodeIds,
    edges: path.edges,
    geometry: routeGeometryFromPath(snapped.index, path),
    maneuvers: buildRouteManeuvers(snapped.index, path, targetLabel, mode),
    distanceKm: summary.distanceKm,
    durationMin: summary.durationMin,
  };
};
