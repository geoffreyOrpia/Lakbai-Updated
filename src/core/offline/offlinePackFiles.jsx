import { createDestinationMapData } from "../maps/destinationMapData.jsx";
import { createOfflineContextMapData, OFFLINE_CONTEXT_META } from "../maps/offlineContextMapData.jsx";

const stringify = value => JSON.stringify(value, null, 2);

export const buildOfflinePackFiles = (
  pack,
  savedAt = Date.now(),
  photoFiles = [],
  routingGraph = null,
  sharedRouting = null,
) => {
  const map = createDestinationMapData(pack);
  const contextMap = createOfflineContextMapData(pack);
  const routes = pack.routeSuggestions ?? [];
  const photos = pack.destination?.photos ?? [];
  const manifest = {
    packId: pack.id,
    destinationName: pack.destination?.name ?? pack.id,
    version: pack.version,
    updatedAt: pack.updatedAt,
    savedAt,
    format: sharedRouting ? 4 : 3,
    ...(sharedRouting ? { sharedRouting } : {}),
    files: {
      guide: 'pack.json',
      map: 'places.geojson',
      contextMap: 'context.geojson',
      routes: 'routes.json',
      photos: 'photos.json',
      ...(routingGraph ? { routingGraph: 'routing.graph.json' } : {}),
    },
    mapContext: OFFLINE_CONTEXT_META,
    imageStorage: 'saved-pack-files',
    photoKeys: photos.map(photo => photo.key),
    photoFiles,
  };
  return {
    'manifest.json': stringify(manifest),
    'pack.json': stringify(pack),
    'places.geojson': stringify(map),
    'context.geojson': stringify(contextMap),
    'routes.json': stringify(routes),
    'photos.json': stringify(photos),
    ...(routingGraph ? { 'routing.graph.json': JSON.stringify(routingGraph) } : {}),
  };
};
