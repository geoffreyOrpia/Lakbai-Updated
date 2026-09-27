const buildDestinationQuery = (place, destination) => {
  if (place.navigation?.query) {
    return place.navigation.query;
  }

  const placeName = place.name ?? destination.name;
  return `${placeName}, ${destination.area}, Davao del Norte, Philippines`;
};

export const openDirectionsToPlace = (deps, place, destination) => {
  return deps.onlineResearchService.openDirections({
    destination: buildDestinationQuery(place, destination),
  });
};
