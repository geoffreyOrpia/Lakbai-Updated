import { calculateOfflineRoute } from "./offlineNavigation.jsx";

const routeSignature = route => (
  (route?.edges ?? []).map(edge => String(edge._turnKey)).join(',')
);

const edgeKeySet = route => new Set(
  (route?.edges ?? []).map(edge => edge._turnKey).filter(Number.isFinite),
);

const overlapRatio = (a, b) => {
  const first = edgeKeySet(a);
  const second = edgeKeySet(b);
  if (!first.size || !second.size) return 0;
  let shared = 0;
  for (const key of first) if (second.has(key)) shared += 1;
  return shared / Math.min(first.size, second.size);
};

const candidateEdgeKeys = route => {
  const edges = (route?.edges ?? []).filter(edge => Number.isFinite(edge._turnKey));
  if (edges.length < 2) return [];
  const indexes = [
    Math.floor(edges.length * 0.2),
    Math.floor(edges.length * 0.4),
    Math.floor(edges.length * 0.6),
    Math.floor(edges.length * 0.8),
  ];
  const longest = [...edges]
    .sort((a, b) => (b.distanceKm ?? 0) - (a.distanceKm ?? 0))
    .slice(0, 3);
  return [...new Set([
    ...indexes.map(index => edges[Math.min(edges.length - 1, index)]?._turnKey),
    ...longest.map(edge => edge._turnKey),
  ].filter(Number.isFinite))];
};

export const calculateOfflineRouteAlternatives = ({
  graph,
  from,
  to,
  mode = 'walk',
  preference = 'direct',
  routeAttractors = [],
  maxSnapDistanceKm = 1,
  targetLabel = 'destination',
  primaryRoute = null,
  limit = 2,
  maxStretchRatio = 1.65,
  maxOverlapRatio = 0.92,
}) => {
  const primary = primaryRoute?.ok
    ? primaryRoute
    : calculateOfflineRoute({
      graph,
      from,
      to,
      mode,
      preference,
      routeAttractors,
      maxSnapDistanceKm,
      targetLabel,
    });
  if (!primary.ok || primary.type) return { primary, alternatives: [] };

  const signatures = new Set([routeSignature(primary)]);
  const alternatives = [];
  for (const edgeKey of candidateEdgeKeys(primary)) {
    if (alternatives.length >= limit) break;
    const candidate = calculateOfflineRoute({
      graph,
      from,
      to,
      mode,
      preference,
      routeAttractors,
      maxSnapDistanceKm,
      targetLabel,
      excludedEdgeKeys: new Set([edgeKey]),
    });
    if (!candidate.ok) continue;
    if (candidate.distanceKm > primary.distanceKm * maxStretchRatio) continue;
    const signature = routeSignature(candidate);
    if (!signature || signatures.has(signature)) continue;
    if (overlapRatio(primary, candidate) > maxOverlapRatio) continue;
    if (alternatives.some(route => overlapRatio(route, candidate) > maxOverlapRatio)) continue;
    signatures.add(signature);
    alternatives.push({
      ...candidate,
      alternativeId: `alt-${alternatives.length + 1}`,
      distanceDeltaKm: candidate.distanceKm - primary.distanceKm,
      durationDeltaMin: candidate.durationMin - primary.durationMin,
    });
  }
  return { primary, alternatives };
};
