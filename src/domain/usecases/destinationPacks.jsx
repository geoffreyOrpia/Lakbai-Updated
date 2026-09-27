// Use cases: pure application rules orchestrating repositories.
// View models call these; they never touch REST, SQLite, or files directly.
const mergeWithDownloadState = (destinations, downloadedMeta, manifests) => {
  const manifestVersions = new Map(manifests.map(manifest => [manifest.id, manifest.version]));
  const metaById = new Map(downloadedMeta.map(meta => [meta.packId, meta]));
  return destinations.map(destination => {
    const meta = metaById.get(destination.id);
    const remoteVersion = manifestVersions.get(destination.id);
    return {
      destination,
      downloaded: Boolean(meta),
      downloadedVersion: meta?.version ?? null,
      updateAvailable: Boolean(meta && remoteVersion != null && remoteVersion > meta.version)
    };
  });
};
/** Bundled destination catalog merged with the user's SQLite library state. */
export const listDestinationsWithState = async (deps, filter = {}) => {
  const [catalogResult, downloadedMeta, manifests] = await Promise.all([deps.destinationRepository.getDestinations(filter), deps.packRepository.listDownloadedMeta(), deps.packRepository.listManifests()]);
  const {
    items: destinations,
    source
  } = catalogResult;
  return {
    items: mergeWithDownloadState(destinations, downloadedMeta, manifests).filter(item => {
      const matchesCategory = !filter.category || filter.category === 'all' || item.destination.category === filter.category;
      const normalizedQuery = (filter.query ?? '').trim().toLowerCase();
      const matchesQuery = !normalizedQuery || [item.destination.name, item.destination.area, item.destination.municipality, item.destination.summary].some(value => value.toLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    }),
    source
  };
};
export const downloadPack = async (deps, packId) => {
  return deps.packRepository.downloadPack(packId);
};
export const removePack = async (deps, packId) => {
  return deps.packRepository.removePack(packId);
};
/** Pack for the destination screen: saved library copy or bundled offline preview. */
export const loadPackForViewing = async (deps, packId) => {
  const local = await deps.packRepository.getDownloadedPack(packId);
  if (local) return {
    pack: local,
    source: 'local'
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
