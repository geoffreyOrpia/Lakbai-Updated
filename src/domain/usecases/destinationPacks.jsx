// Use cases: pure application rules orchestrating repositories.
// View models call these; they never touch REST, SQLite, or files directly.
const mergeWithLibraryState = (destinations, savedMeta, manifests) => {
  const manifestVersions = new Map(manifests.map(manifest => [manifest.id, manifest.version]));
  const metaById = new Map(savedMeta.map(meta => [meta.packId, meta]));
  return destinations.map(destination => {
    const meta = metaById.get(destination.id);
    const bundledVersion = manifestVersions.get(destination.id);
    return {
      destination,
      saved: Boolean(meta),
      savedVersion: meta?.version ?? null,
      updateAvailable: Boolean(meta && bundledVersion != null && bundledVersion > meta.version)
    };
  });
};
/** Bundled destination catalog merged with the user's SQLite library state. */
export const listDestinationsWithState = async (deps, filter = {}) => {
  const [catalogResult, savedMeta, manifests, favoriteIds] = await Promise.all([
    deps.destinationRepository.getDestinations(filter),
    deps.packRepository.listSavedMeta(),
    deps.packRepository.listManifests(),
    deps.favoriteRepository?.listFavoriteIds?.() ?? [],
  ]);
  const {
    items: destinations,
    source
  } = catalogResult;
  return {
    items: mergeWithLibraryState(destinations, savedMeta, manifests).map(item => ({
      ...item,
      favorite: favoriteIds.includes(item.destination.id),
    })).filter(item => {
      const matchesCategory = !filter.category || filter.category === 'all' || item.destination.category === filter.category;
      const normalizedQuery = (filter.query ?? '').trim().toLowerCase();
      const matchesQuery = !normalizedQuery || [item.destination.name, item.destination.area, item.destination.municipality, item.destination.summary].some(value => value.toLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    }),
    source
  };
};
export const savePackToLibrary = async (deps, packId) => {
  return deps.packRepository.savePack(packId);
};
export const removePackFromLibrary = async (deps, packId) => {
  return deps.packRepository.removePack(packId);
};
export const loadOfflineBundleStatus = async (deps, packId) => {
  return deps.packRepository.getOfflineBundleStatus?.(packId) ?? null;
};
/** Pack for the destination screen: saved library copy or bundled offline preview. */
export const loadPackForViewing = async (deps, packId) => {
  const saved = await deps.packRepository.getSavedPack(packId);
  if (saved) return {
    pack: saved,
    source: 'library'
  };
  const bundled = await deps.packRepository.getBundledPack(packId);
  if (bundled) return {
    pack: bundled,
    source: 'bundled'
  };
  return {
    pack: null,
    source: 'none'
  };
};
