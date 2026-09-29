import streetIndex from "../../data/assets/discovery/streetIndex.json";
import { haversineKm } from "../../core/utils/geo.jsx";

const MAX_RECENTS = 8;
const MAX_PINS = 12;
const hasCoordinates = item => Number.isFinite(item?.lat) && Number.isFinite(item?.lng);
const normalize = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const destinationCenter = pack => {
  const points = (pack?.spots ?? []).filter(hasCoordinates);
  if (!points.length) return null;
  return {
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
    lng: points.reduce((sum, point) => sum + point.lng, 0) / points.length,
  };
};

const prepareSearchEntry = entry => ({
  ...entry,
  _searchName: normalize(entry.name),
  _searchAliases: (entry.aliases ?? []).map(normalize),
  _searchText: normalize([
    entry.name,
    entry.subtitle,
    ...(entry.aliases ?? []),
  ].join(' ')),
});

const scoreEntry = (entry, query) => {
  if (!query) return 1;
  const name = entry._searchName ?? normalize(entry.name);
  const aliases = entry._searchAliases ?? (entry.aliases ?? []).map(normalize);
  const haystack = entry._searchText ?? normalize([
    entry.name,
    entry.subtitle,
    ...(entry.aliases ?? []),
  ].join(' '));
  if (name === query) return 100;
  if (aliases.includes(query)) return 95;
  if (name.startsWith(query)) return 85;
  if (aliases.some(alias => alias.startsWith(query))) return 80;
  const tokens = query.split(' ').filter(Boolean);
  if (tokens.every(token => haystack.includes(token))) return 60;
  return 0;
};

export const loadOfflineDiscoveryCatalog = async deps => {
  const manifests = await deps.packRepository.listManifests();
  const packs = (await Promise.all(
    manifests.map(manifest => deps.packRepository.getBundledPack(manifest.id)),
  )).filter(Boolean);

  const places = packs.flatMap(pack => {
    const destination = pack.destination ?? {};
    const center = destinationCenter(pack);
    const destinationEntry = center ? [{
      id: `destination:${pack.id}`,
      kind: 'destination',
      name: destination.name ?? pack.id,
      subtitle: [destination.area, destination.province].filter(Boolean).join(' · '),
      aliases: destination.aliases ?? [],
      destinationId: pack.id,
      category: destination.category ?? 'destination',
      coordinateStatus: 'derived-area-center',
      ...center,
    }] : [];
    const spotEntries = (pack.spots ?? []).filter(hasCoordinates).map(spot => ({
      id: `place:${pack.id}:${spot.id}`,
      kind: 'place',
      name: spot.name,
      subtitle: [destination.name, destination.municipality].filter(Boolean).join(' · '),
      aliases: spot.aliases ?? [],
      destinationId: pack.id,
      spotId: spot.id,
      category: spot.category ?? 'place',
      description: spot.description ?? '',
      coordinateStatus: spot.coordinateVerified === true ? 'verified' : 'mapped-unverified',
      lat: spot.lat,
      lng: spot.lng,
    }));
    return [...destinationEntry, ...spotEntries];
  }).map(prepareSearchEntry);

  const streets = (streetIndex.entries ?? []).map(street => ({
    ...street,
    kind: 'street',
    subtitle: [street.municipality, street.regionLabel]
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(' · '),
    category: 'street',
    coordinateStatus: 'osm-road-reference',
  })).map(prepareSearchEntry);

  return { places, streets };
};

export const searchOfflineDiscovery = (
  catalog,
  query,
  { fix = null, limit = 30 } = {},
) => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  return [...(catalog?.places ?? []), ...(catalog?.streets ?? [])]
    .map(entry => ({
      ...entry,
      score: scoreEntry(entry, normalizedQuery),
      distanceKm: fix && hasCoordinates(fix) && hasCoordinates(entry)
        ? haversineKm(fix, entry)
        : null,
    }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => (
      b.score - a.score
      || (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY)
      || a.name.localeCompare(b.name)
    ))
    .slice(0, limit);
};

/**
 * List every curated tourism place bundled with LakBai, not only places whose
 * guides are already saved. Distance ranking remains fully offline.
 */
export const listOfflineTourismPlaces = (
  catalog,
  { fix = null, limit = 30 } = {},
) => (
  (catalog?.places ?? [])
    .filter(hasCoordinates)
    .map(entry => ({
      ...entry,
      distanceKm: fix && hasCoordinates(fix) ? haversineKm(fix, entry) : null,
    }))
    .sort((a, b) => (
      (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY)
      || a.name.localeCompare(b.name)
    ))
    .slice(0, limit)
);

export const loadDiscoveryState = deps => deps.discoveryRepository.getState();

export const recordDiscoveryRecent = async (deps, entry) => {
  if (!entry?.id || !entry?.name || !hasCoordinates(entry)) return;
  const current = await deps.discoveryRepository.getState();
  const recent = {
    id: entry.id,
    kind: entry.kind,
    name: entry.name,
    subtitle: entry.subtitle ?? '',
    destinationId: entry.destinationId ?? null,
    coordinateStatus: entry.coordinateStatus ?? 'mapped-unverified',
    lat: entry.lat,
    lng: entry.lng,
    usedAt: Date.now(),
  };
  const recents = [
    recent,
    ...(current.recents ?? []).filter(item => item.id !== recent.id),
  ].slice(0, MAX_RECENTS);
  await deps.discoveryRepository.saveState({ ...current, recents });
  return recents;
};

export const saveDroppedPin = async (deps, point) => {
  if (!hasCoordinates(point)) throw new Error('Dropped pin coordinates are invalid.');
  const current = await deps.discoveryRepository.getState();
  const pin = {
    id: `pin:${Date.now()}:${Math.round(point.lat * 1e5)}:${Math.round(point.lng * 1e5)}`,
    kind: 'pin',
    name: point.name ?? 'Dropped pin',
    subtitle: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} · Saved on this device`,
    coordinateStatus: 'user-pin',
    lat: point.lat,
    lng: point.lng,
    createdAt: Date.now(),
  };
  const pins = [pin, ...(current.pins ?? [])].slice(0, MAX_PINS);
  await deps.discoveryRepository.saveState({ ...current, pins });
  return { pin, pins };
};

export const removeDroppedPin = async (deps, pinId) => {
  const current = await deps.discoveryRepository.getState();
  const pins = (current.pins ?? []).filter(pin => pin.id !== pinId);
  await deps.discoveryRepository.saveState({ ...current, pins });
  return pins;
};
