import { haversineKm } from "../../core/utils/geo.jsx";
import { routingRegionFor } from "../../data/assets/routingRegionAssets.jsx";
import { calculateOfflineMultiStopJourney } from "./multiStopJourney.jsx";

const ferryRequirementFor = (place, origin) => {
  if (!origin) return null;
  const originRegion = routingRegionFor(null, origin);
  if (!originRegion || !place.region) return null;
  return originRegion !== place.region;
};

const distanceFor = (place, origin, routeEstimates) => {
  const estimate = routeEstimates?.[place.id];
  if (Number.isFinite(estimate?.distanceKm)) return estimate.distanceKm;
  return origin ? haversineKm(origin, place.target) : null;
};

const scoreFor = ({ place, preferences, matches, distanceKm }) => {
  let score = preferences.interests.length ? 40 + Math.max(0, matches.length - 1) * 8 : 12;
  score += place.sourceReview.level === 'official-reference' ? 12 : 6;
  if (place.saved) score += 8;
  if (place.offlineNavigationAvailable) score += 8;
  if (preferences.walking === 'easy' && place.planningDifficulty === 'easy') score += 8;
  if (Number.isFinite(distanceKm)) score += Math.max(0, 20 - Math.min(20, distanceKm));
  return score;
};

const reasonsFor = ({
  place,
  preferences,
  matches,
  distanceKm,
  routeEstimate,
  requiresFerry,
}) => {
  const reasons = [];
  if (matches.length) reasons.push(`Matches ${matches.slice(0, 2).join(' + ')}`);
  reasons.push(place.sourceReview.level === 'official-reference'
    ? 'Destination pack includes official tourism/government sources'
    : 'Destination pack content is source-reviewed');
  if (place.saved) reasons.push('Offline pack saved');
  else if (place.offlineNavigationAvailable) reasons.push('Offline route target available');
  if (preferences.walking === 'easy' && place.planningDifficulty === 'easy') {
    reasons.push('Destination pack includes an easy planning route');
  }
  if (Number.isFinite(routeEstimate?.durationMin)) {
    reasons.push(`About ${Math.max(1, Math.round(routeEstimate.durationMin))} min by route`);
  } else if (Number.isFinite(distanceKm)) {
    reasons.push(`${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km from current position`);
  }
  if (requiresFerry === true) reasons.push('Requires mainland–Samal ferry crossing');
  return reasons;
};

export const recommendTourismPlaces = (catalog, preferences = {}, context = {}) => {
  const normalized = {
    interests: preferences.interests ?? [],
    walking: preferences.walking ?? 'any',
    travelMode: preferences.travelMode ?? 'drive',
    ferry: preferences.ferry ?? 'allow',
    savedOnly: Boolean(preferences.savedOnly),
    maxDistanceKm: Number.isFinite(preferences.maxDistanceKm) ? preferences.maxDistanceKm : null,
  };
  const origin = context.origin ?? null;
  const routeEstimates = context.routeEstimates ?? {};
  const results = [];

  for (const place of catalog ?? []) {
    if (normalized.savedOnly && !place.saved) continue;
    const matches = normalized.interests.filter(interest => place.interests.includes(interest));
    if (normalized.interests.length && !matches.length) continue;
    if (
      normalized.walking === 'easy'
      && place.planningDifficulty
      && place.planningDifficulty !== 'easy'
    ) continue;

    const requiresFerry = ferryRequirementFor(place, origin);
    if (normalized.ferry === 'avoid' && requiresFerry === true) continue;

    const distanceKm = distanceFor(place, origin, routeEstimates);
    if (
      normalized.maxDistanceKm != null
      && Number.isFinite(distanceKm)
      && distanceKm > normalized.maxDistanceKm
    ) continue;

    const routeEstimate = routeEstimates[place.id] ?? null;
    results.push({
      ...place,
      requiresFerry,
      distanceKm,
      routeEstimate,
      interestMatches: matches,
      score: scoreFor({ place, preferences: normalized, matches, distanceKm }),
      reasons: reasonsFor({
        place,
        preferences: normalized,
        matches,
        distanceKm,
        routeEstimate,
        requiresFerry,
      }),
    });
  }

  return results.sort((a, b) => (
    b.score - a.score
    || (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY)
    || a.name.localeCompare(b.name)
  ));
};

export const estimateRecommendationRoutes = async ({
  routingGraphRepository,
  origin,
  recommendations,
  mode = 'drive',
  limit = 8,
}) => {
  if (!routingGraphRepository || !origin) return {};
  const estimates = {};
  for (const place of (recommendations ?? []).slice(0, limit)) {
    try {
      const route = await calculateOfflineMultiStopJourney({
        routingGraphRepository,
        from: origin,
        stops: [{
          id: place.id,
          destinationId: place.destinationId,
          name: place.name,
          target: place.target,
        }],
        mode,
        preference: 'direct',
        maxSnapDistanceKm: 1.5,
      });
      if (route?.ok) {
        estimates[place.id] = {
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
          requiresFerry: place.requiresFerry === true,
        };
      }
    } catch {
      // Straight-line proximity remains available if detailed routing is unavailable.
    }
  }
  return estimates;
};

const orderedForTrip = (places, origin) => {
  if (!origin || places.length < 2) return [...places];
  const remaining = [...places];
  const ordered = [];
  let current = origin;
  let currentRegion = routingRegionFor(null, origin);

  while (remaining.length) {
    let bestIndex = 0;
    let bestCost = Number.POSITIVE_INFINITY;
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const crossingPenalty = currentRegion && candidate.region && currentRegion !== candidate.region
        ? 12
        : 0;
      const cost = haversineKm(current, candidate.target) + crossingPenalty;
      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = index;
      }
    }
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    current = next.target;
    currentRegion = next.region ?? currentRegion;
  }
  return ordered;
};

export const buildSmartTripDraft = ({
  recommendations,
  selectedIds,
  origin = null,
  travelMode = 'drive',
}) => {
  const selected = (recommendations ?? []).filter(place => selectedIds?.includes(place.id));
  if (selected.length < 2) return null;
  const ordered = orderedForTrip(selected.slice(0, 4), origin);
  const municipalities = [...new Set(ordered.map(place => place.municipality).filter(Boolean))];
  const areaLabel = municipalities.length === 1 ? municipalities[0] : 'Davao del Norte';
  return {
    kind: 'smart-explore',
    title: `Smart ${areaLabel} trip`,
    travelMode,
    notes: [
      'Generated offline by LakBai Smart Explore from curated local knowledge in source-reviewed destination packs.',
      `Travel mode: ${travelMode === 'drive' ? 'Driving' : 'Walking'}.`,
      origin
        ? 'Stop order is proximity-aware from the current GPS position.'
        : 'Stop order follows recommendation priority; you can reorder it before saving.',
      'Fees, opening hours, and visit duration are not assumed when LakBai does not have structured sourced values.',
    ].join('\n'),
    stops: ordered.map(place => ({
      destinationId: place.destinationId,
      destinationName: place.name,
      packName: place.destinationName,
      municipality: place.municipality,
      placeId: place.placeId,
      target: { ...place.target },
      note: place.reasons.slice(0, 2).join(' · '),
      sourceReview: {
        label: place.sourceReview.label,
        reviewedAt: place.sourceReview.reviewedAt,
      },
    })),
  };
};
