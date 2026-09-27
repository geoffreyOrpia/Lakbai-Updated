import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { buildOfflinePackFiles } from "../../core/offline/offlinePackFiles.jsx";
import { getDestinationPhotoModule } from "../assets/destinationPhotos.jsx";

const rootDirectory = () => new Directory(Paths.document, 'lakbaylokal', 'packs');
const packDirectory = packId => new Directory(rootDirectory(), packId);

const statusFor = packId => {
  const directory = packDirectory(packId);
  if (!directory.exists) return null;
  const mapFile = new File(directory, 'places.geojson');
  const manifestFile = new File(directory, 'manifest.json');
  if (!mapFile.exists || !manifestFile.exists) return null;
  return {
    directoryUri: directory.uri,
    mapUri: mapFile.uri,
    manifestUri: manifestFile.uri,
    imageDirectoryUri: new Directory(directory, 'images').uri,
    sizeBytes: directory.size ?? 0,
  };
};

export const createOfflinePackStorage = () => ({
  savePack: async pack => {
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
  getStatus: async packId => statusFor(packId),
  removePack: async packId => {
    const directory = packDirectory(packId);
    if (directory.exists) {
      directory.delete();
    }
  },
});
