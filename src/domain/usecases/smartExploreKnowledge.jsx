import { routingRegionFor } from "../../data/assets/routingRegionAssets.jsx";

const CATEGORY_INTERESTS = Object.freeze({
  attraction: ['sightseeing'],
  beach: ['beach', 'nature', 'relaxation'],
  facility: ['visitor-services'],
  island: ['beach', 'nature', 'sightseeing'],
  landmark: ['culture', 'photography', 'sightseeing'],
  market: ['food', 'shopping', 'local-culture'],
  museum: ['culture', 'education', 'history'],
  park: ['nature', 'family', 'relaxation'],
  town: ['food', 'shopping', 'local-culture'],
  transport: ['transport'],
  viewpoint: ['photography', 'scenery', 'sightseeing'],
});

const TEXT_INTERESTS = Object.freeze([
  ['nature', ['falls', 'waterfall', 'forest', 'mangrove', 'wildlife', 'cave', 'coast', 'shore', 'bird']],
  ['beach', ['beach', 'sandbar', 'white-sand', 'shoreline', 'snorkel']],
  ['swimming', ['swim', 'pool', 'waterfall']],
  ['wildlife', ['bat', 'wildlife', 'bird', 'colony', 'sanctuary']],
  ['culture', ['cathedral', 'museum', 'heritage', 'festival', 'history']],
  ['food', ['food', 'market', 'produce', 'delicacies', 'sari-sari']],
  ['shopping', ['market', 'pasalubong', 'souvenir', 'trade center']],
  ['photography', ['view', 'sunset', 'photo', 'golden', 'scenic']],
  ['education', ['museum', 'educational', 'conservation', 'briefing', 'history']],
  ['family', ['family', 'children', 'park', 'picnic']],
  ['adventure', ['trail', 'hike', 'snorkel', 'island jump']],
]);

export const SMART_INTEREST_OPTIONS = Object.freeze([
  { key: 'nature', label: 'Nature' },
  { key: 'beach', label: 'Beach' },
  { key: 'culture', label: 'Culture' },
  { key: 'food', label: 'Food' },
  { key: 'wildlife', label: 'Wildlife' },
  { key: 'photography', label: 'Photography' },
  { key: 'family', label: 'Family' },
  { key: 'adventure', label: 'Adventure' },
]);

const unique = values => [...new Set(values.filter(Boolean))];

const interestsFor = (destination, spot) => {
  const interests = [...(CATEGORY_INTERESTS[spot.category] ?? [])];
  const text = [
    spot.name,
    spot.category,
    spot.description,
    spot.tip,
    destination.name,
    destination.category,
    destination.summary,
    ...(destination.highlights ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
  for (const [key, terms] of TEXT_INTERESTS) {
    if (terms.some(term => text.includes(term))) interests.push(key);
  }
  return unique(interests);
};

const isOfficialSource = source => {
  const url = String(source?.url ?? '').toLowerCase();
  const label = String(source?.label ?? '').toLowerCase();
  return /https?:\/\/[^/]*\.gov\.ph(?:\/|$)/.test(url)
    || label.includes('city government')
    || label.includes('city tourism')
    || label.includes('tourism office');
};

export const sourceReviewFor = verification => {
  const sources = verification?.sources ?? [];
  const officialSourceCount = sources.filter(isOfficialSource).length;
  if (verification?.status === 'prototype' || !sources.length) {
    return {
      eligible: false,
      level: 'prototype',
      label: 'Prototype content',
      reviewedAt: verification?.reviewedAt ?? null,
      sourceCount: sources.length,
      officialSourceCount,
    };
  }
  return {
    eligible: true,
    level: officialSourceCount > 0 ? 'official-reference' : 'source-reviewed',
    label: officialSourceCount > 0 ? 'Pack has official sources' : 'Pack source-reviewed',
    reviewedAt: verification?.reviewedAt ?? null,
    sourceCount: sources.length,
    officialSourceCount,
  };
};

const planningDifficultyFor = pack => {
  const difficulties = unique((pack?.routeSuggestions ?? []).map(route => route.difficulty));
  return difficulties.length === 1 ? difficulties[0] : null;
};

export const buildSmartExploreCatalog = (items, packsById = new Map()) => {
  const places = [];
  for (const item of items ?? []) {
    const destination = item?.destination;
    if (!destination || destination.status !== 'available') continue;
    const sourceReview = sourceReviewFor(destination.verification);
    if (!sourceReview.eligible) continue;
    const pack = packsById.get(destination.id);
    if (!pack) continue;
    const planningDifficulty = planningDifficultyFor(pack);
    for (const spot of pack.spots ?? []) {
      if (!Number.isFinite(spot?.lat) || !Number.isFinite(spot?.lng)) continue;
      const region = routingRegionFor(destination.id)
        ?? routingRegionFor(destination.id, spot);
      places.push({
        id: `${destination.id}:${spot.id}`,
        placeId: spot.id,
        destinationId: destination.id,
        destinationName: destination.name,
        municipality: destination.municipality,
        name: spot.name,
        category: spot.category,
        description: spot.description ?? '',
        tip: spot.tip ?? '',
        target: { label: spot.name, lat: spot.lat, lng: spot.lng },
        region,
        interests: interestsFor(destination, spot),
        planningDifficulty,
        sourceReview,
        saved: Boolean(item.saved),
        offlineNavigationAvailable: Boolean(region),
      });
    }
  }
  return places;
};

export const loadSmartExploreCatalog = async (deps, items) => {
  const packsById = new Map();
  await Promise.all((items ?? []).map(async item => {
    const destinationId = item?.destination?.id;
    if (!destinationId || item.destination.status !== 'available') return;
    let pack = null;
    try {
      pack = await deps.packRepository.getSavedPack?.(destinationId);
    } catch {
      pack = null;
    }
    if (!pack) {
      try {
        pack = await deps.packRepository.getBundledPack?.(destinationId);
      } catch {
        pack = null;
      }
    }
    if (pack) packsById.set(destinationId, pack);
  }));
  return buildSmartExploreCatalog(items, packsById);
};
