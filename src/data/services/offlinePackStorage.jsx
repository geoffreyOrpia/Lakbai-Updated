import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { buildOfflinePackFiles } from "../../core/offline/offlinePackFiles.jsx";
import { getDestinationPhotoModule } from "../assets/destinationPhotos.jsx";
import { getOfflineBasemapModule } from "../assets/offlineBasemapAsset.jsx";

const rootDirectory = () => new Directory(Paths.document, 'lakbaylokal', 'packs');
const packDirectory = packId => new Directory(rootDirectory(), packId);
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
    if (destinationFile.exists) {
      destinationFile.delete();
    }
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
  return {
    directoryUri: directory.uri,
    mapUri: mapFile.uri,
    contextMapUri: contextMapFile.uri,
    manifestUri: manifestFile.uri,
    imageDirectoryUri: new Directory(directory, 'images').uri,
    sizeBytes: directory.size ?? 0,
    basemapUri: basemap?.uri ?? null,
    basemapSizeBytes: basemap?.sizeBytes ?? 0,
  };
};

export const createOfflinePackStorage = () => ({
  savePack: async pack => {
    await ensureSharedBasemap();
    const directory = packDirectory(pack.id);
    try {
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
        if (destinationFile.exists) {
          destinationFile.delete();
        }
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
      return statusFor(pack.id);
    } catch (error) {
      if (directory.exists) {
        directory.delete();
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
    if (directory.exists) {
      directory.delete();
    }
  },
});
