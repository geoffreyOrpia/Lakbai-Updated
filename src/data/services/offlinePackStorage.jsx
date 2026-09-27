import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { buildOfflinePackFiles } from "../../core/offline/offlinePackFiles.jsx";
import { getDestinationPhotoModule } from "../assets/destinationPhotos.jsx";
import { getOfflineBasemapModule } from "../assets/offlineBasemapAsset.jsx";

const rootDirectory = () => new Directory(Paths.document, 'lakbaylokal', 'packs');
const packDirectory = packId => new Directory(rootDirectory(), packId);
const stagingDirectory = packId => new Directory(rootDirectory(), `${packId}.staging`);
const backupDirectory = packId => new Directory(rootDirectory(), `${packId}.backup`);
const mapDirectory = () => new Directory(Paths.document, 'lakbaylokal', 'maps');
const basemapFile = () => new File(mapDirectory(), 'davao-del-norte.pmtiles');

const sharedBasemapStatus = () => {
  const file = basemapFile();
  if (!file.exists) return null;
  return {
    uri: file.uri,
    sizeBytes: file.size ?? 0,
  };
};

const ensureSharedBasemap = async () => {
  const existing = sharedBasemapStatus();
  if (existing) return existing;

  const moduleSource = getOfflineBasemapModule();
  if (!moduleSource) return null;

  const directory = mapDirectory();
  const destinationFile = basemapFile();
  try {
    directory.create({
      intermediates: true,
      idempotent: true,
    });
    const asset = Asset.fromModule(moduleSource);
    await asset.downloadAsync();
    if (!asset.localUri) return null;
    new File(asset.localUri).copy(destinationFile);
    return sharedBasemapStatus();
  } catch {
    if (destinationFile.exists) destinationFile.delete();
    return null;
  }
};

const statusFor = packId => {
  const directory = packDirectory(packId);
  if (!directory.exists) return null;
  const mapFile = new File(directory, 'places.geojson');
  const contextMapFile = new File(directory, 'context.geojson');
  const manifestFile = new File(directory, 'manifest.json');
  if (!mapFile.exists || !contextMapFile.exists || !manifestFile.exists) return null;
  const basemap = sharedBasemapStatus();
  const sizeBytes = directory.size ?? 0;
  return {
    directoryUri: directory.uri,
    mapUri: mapFile.uri,
    contextMapUri: contextMapFile.uri,
    manifestUri: manifestFile.uri,
    imageDirectoryUri: new Directory(directory, 'images').uri,
    sizeBytes,
    basemapUri: basemap?.uri ?? null,
    basemapSizeBytes: basemap?.sizeBytes ?? 0,
    totalSizeBytes: sizeBytes + (basemap?.sizeBytes ?? 0),
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
    const asset = Asset.fromModule(moduleSource);
    await asset.downloadAsync();
    if (!asset.localUri) {
      throw new Error(`Bundled photo ${photo.key} could not be materialized locally.`);
    }
    const fileName = `${photo.key}.${asset.type || 'jpg'}`;
    const sourceFile = new File(asset.localUri);
    const destinationFile = new File(imageDirectory, fileName);
    if (destinationFile.exists) destinationFile.delete();
    sourceFile.copy(destinationFile);
    photoFiles.push(`images/${fileName}`);
  }

  const files = buildOfflinePackFiles(pack, Date.now(), photoFiles);
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
  savePack: async pack => {
    await ensureSharedBasemap();
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
