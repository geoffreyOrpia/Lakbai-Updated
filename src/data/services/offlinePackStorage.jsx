import { Directory, File, Paths } from 'expo-file-system';
import { buildOfflinePackFiles } from "../../core/offline/offlinePackFiles.jsx";
import { copyBundledAsset } from "./bundledAssetFile.jsx";
import { getDestinationPhotoModule } from "../assets/destinationPhotos.jsx";
import { getOfflineBasemapModule, OFFLINE_BASEMAP_META } from "../assets/offlineBasemapAsset.jsx";
import { routingRegionFor } from "../assets/routingRegionAssets.jsx";
import { sharedRoutingStorage } from "./sharedRoutingStorage.jsx";

const rootDirectory = () => new Directory(Paths.document, 'lakbaylokal', 'packs');
const packDirectory = packId => new Directory(rootDirectory(), packId);
const stagingDirectory = packId => new Directory(rootDirectory(), `${packId}.staging`);
const backupDirectory = packId => new Directory(rootDirectory(), `${packId}.backup`);
const mapDirectory = () => new Directory(Paths.document, 'lakbaylokal', 'maps');
// A new bundled map must not silently reuse an older, less detailed saved copy.
const basemapFile = () => new File(mapDirectory(), `davao-del-norte-${OFFLINE_BASEMAP_META.revision}.pmtiles`);
const basemapStagingFile = () => new File(mapDirectory(), `davao-del-norte-${OFFLINE_BASEMAP_META.revision}.pmtiles.staging`);
let basemapPreparation = null;

const sharedBasemapStatus = () => {
  const file = basemapFile();
  if (!file.exists || file.size !== OFFLINE_BASEMAP_META.sizeBytes) return null;
  return {
    uri: file.uri,
    sizeBytes: file.size ?? 0,
  };
};

const ensureSharedBasemap = async () => {
  const existing = sharedBasemapStatus();
  if (existing) return existing;
  if (basemapPreparation) return basemapPreparation;

  const moduleSource = getOfflineBasemapModule();
  if (!moduleSource) return null;

  const task = (async () => {
    const directory = mapDirectory();
    const destinationFile = basemapFile();
    const stagingFile = basemapStagingFile();
    try {
      directory.create({
        intermediates: true,
        idempotent: true,
      });
      if (stagingFile.exists) stagingFile.delete();
      await copyBundledAsset(
        moduleSource,
        stagingFile,
        'Bundled Davao del Norte map is not available locally.',
      );
      if (!stagingFile.exists || stagingFile.size !== OFFLINE_BASEMAP_META.sizeBytes) {
        throw new Error('Bundled Davao del Norte map failed its size check.');
      }
      const prepared = sharedBasemapStatus();
      if (prepared) return prepared;
      if (destinationFile.exists) destinationFile.delete();
      stagingFile.move(destinationFile);
      return sharedBasemapStatus();
    } catch {
      return null;
    } finally {
      const remaining = basemapStagingFile();
      if (remaining.exists) remaining.delete();
    }
  })();

  basemapPreparation = task;
  try {
    return await task;
  } finally {
    if (basemapPreparation === task) basemapPreparation = null;
  }
};

const recoverPack = packId => {
  const live = packDirectory(packId);
  const backup = backupDirectory(packId);
  if (!live.exists && backup.exists) backup.move(packDirectory(packId));
};

const statusFor = packId => {
  const directory = packDirectory(packId);
  if (!directory.exists) return null;
  const mapFile = new File(directory, 'places.geojson');
  const contextMapFile = new File(directory, 'context.geojson');
  const manifestFile = new File(directory, 'manifest.json');
  if (!mapFile.exists || !contextMapFile.exists || !manifestFile.exists) return null;
  const routingGraphFile = new File(directory, 'routing.graph.json');
  const region = routingRegionFor(packId);
  let sharedRouting = sharedRoutingStorage.status(region);
  if (!sharedRouting) {
    try {
      const reference = JSON.parse(manifestFile.textSync()).sharedRouting;
      if (reference) sharedRouting = sharedRoutingStorage.status(region, reference);
    } catch { /* Keep legacy map files available when a manifest is damaged. */ }
  }
  const basemap = sharedBasemapStatus();
  const sizeBytes = directory.size ?? 0;
  return {
    directoryUri: directory.uri,
    mapUri: mapFile.uri,
    contextMapUri: contextMapFile.uri,
    manifestUri: manifestFile.uri,
    routingGraphUri: sharedRouting?.uri ?? (routingGraphFile.exists ? routingGraphFile.uri : null),
    sharedRouting: sharedRouting?.reference ?? null,
    routingGraphSizeBytes: sharedRouting?.sizeBytes ?? (routingGraphFile.exists ? routingGraphFile.size ?? 0 : 0),
    imageDirectoryUri: new Directory(directory, 'images').uri,
    sizeBytes,
    basemapUri: basemap?.uri ?? null,
    basemapSizeBytes: basemap?.sizeBytes ?? 0,
    totalSizeBytes: sizeBytes + (basemap?.sizeBytes ?? 0) + (sharedRouting?.sizeBytes ?? 0),
  };
};

const writePackDirectory = async (pack, directory) => {
  directory.create({
    intermediates: true,
    idempotent: true,
  });
  const imageDirectory = new Directory(directory, 'images');
  imageDirectory.create({
    intermediates: true,
    idempotent: true,
  });

  const photoFiles = [];
  for (const photo of pack.destination?.photos ?? []) {
    const moduleSource = getDestinationPhotoModule(photo.key);
    if (!moduleSource) continue;
    const fileName = `${photo.key}.jpg`;
    const destinationFile = new File(imageDirectory, fileName);
    if (destinationFile.exists) destinationFile.delete();
    const asset = await copyBundledAsset(
      moduleSource,
      destinationFile,
      `Bundled photo ${photo.key} could not be materialized locally.`,
    );
    if (asset.type && asset.type !== 'jpg') {
      const typedFileName = `${photo.key}.${String(asset.type).replace(/^\./, '')}`;
      const typedFile = new File(imageDirectory, typedFileName);
      if (typedFile.exists) typedFile.delete();
      destinationFile.move(typedFile);
      photoFiles.push(`images/${typedFileName}`);
    } else {
      photoFiles.push(`images/${fileName}`);
    }
  }

  const region = routingRegionFor(pack.id);
  const routing = region ? await sharedRoutingStorage.ensure(region) : null;
  const files = buildOfflinePackFiles(pack, Date.now(), photoFiles, null, routing?.reference ?? null);
  for (const [name, content] of Object.entries(files)) {
    const file = new File(directory, name);
    file.create({
      intermediates: true,
      overwrite: true,
    });
    file.write(content);
  }
};

export const createOfflinePackStorage = () => ({
  getBasemapStatus: async () => {
    await ensureSharedBasemap();
    return sharedBasemapStatus();
  },
  savePack: async pack => {
    await ensureSharedBasemap();
    recoverPack(pack.id);
    const live = packDirectory(pack.id);
    const staging = stagingDirectory(pack.id);
    const backup = backupDirectory(pack.id);

    if (staging.exists) staging.delete();
    if (backup.exists) backup.delete();

    try {
      await writePackDirectory(pack, staging);
      if (live.exists) live.move(backup);
      // Expo FileSystem updates a Directory object's URI after move(), so use
      // a fresh destination object instead of the moved `live` instance.
      staging.move(packDirectory(pack.id));
      if (backup.exists) backup.delete();
      return statusFor(pack.id);
    } catch (error) {
      if (staging.exists) staging.delete();
      const currentLive = packDirectory(pack.id);
      if (backup.exists) {
        if (currentLive.exists) currentLive.delete();
        backup.move(packDirectory(pack.id));
      }
      throw error;
    }
  },
  getStatus: async packId => {
    await ensureSharedBasemap();
    recoverPack(packId);
    if (packDirectory(packId).exists && routingRegionFor(packId)) {
      try { await sharedRoutingStorage.ensure(routingRegionFor(packId)); } catch { /* Preserve the legacy pack; navigation reports missing routing data. */ }
    }
    return statusFor(packId);
  },
  removePack: async packId => {
    const directory = packDirectory(packId);
    const staging = stagingDirectory(packId);
    const backup = backupDirectory(packId);
    if (directory.exists) directory.delete();
    if (staging.exists) staging.delete();
    if (backup.exists) backup.delete();
  },
});
