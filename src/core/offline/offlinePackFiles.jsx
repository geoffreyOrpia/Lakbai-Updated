import { createDestinationMapData } from "../maps/destinationMapData.jsx";

const stringify = value => JSON.stringify(value, null, 2);

export const buildOfflinePackFiles = (pack, savedAt = Date.now(), photoFiles = []) => {
  const map = createDestinationMapData(pack);
  const routes = pack.routeSuggestions ?? [];
  const photos = pack.destination?.photos ?? [];
  const manifest = {
    packId: pack.id,
    destinationName: pack.destination?.name ?? pack.id,
    version: pack.version,
    updatedAt: pack.updatedAt,
    savedAt,
    format: 1,
    files: {
      guide: 'pack.json',
      map: 'places.geojson',
      routes: 'routes.json',
      photos: 'photos.json',
    },
    imageStorage: 'saved-pack-files',
    photoKeys: photos.map(photo => photo.key),
    photoFiles,
  };
  return {
    'manifest.json': stringify(manifest),
    'pack.json': stringify(pack),
    'places.geojson': stringify(map),
    'routes.json': stringify(routes),
    'photos.json': stringify(photos),
  };
};
