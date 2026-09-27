const PHOTO_SOURCES = Object.freeze({
  'samal-island': require('../../../assets/destinations/samal-island.jpg'),
  'hagimit-falls': require('../../../assets/destinations/hagimit-falls.jpg'),
  'monfort-bats': require('../../../assets/destinations/monfort-bats.jpg'),
  'tagum-cathedral': require('../../../assets/destinations/tagum-cathedral.jpg'),
  'panabo-city': require('../../../assets/destinations/panabo-city.jpg'),
});

export const getDestinationPhotoSource = (key) => PHOTO_SOURCES[key] ?? null;
export const getDestinationPhotoModule = (key) => PHOTO_SOURCES[key] ?? null;
