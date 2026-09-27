export const createDestinationMapData = pack => {
  const places = (pack?.spots ?? []).filter(spot => (
    Number.isFinite(spot?.lat) && Number.isFinite(spot?.lng)
  ));
  const features = places.map(spot => ({
    type: 'Feature',
    id: spot.id,
    properties: {
      id: spot.id,
      name: spot.name,
      category: spot.category ?? 'place',
    },
    geometry: {
      type: 'Point',
      coordinates: [spot.lng, spot.lat],
    },
  }));
  return {
    type: 'FeatureCollection',
    features,
  };
};

export const destinationMapBounds = geojson => {
  const coordinates = (geojson?.features ?? [])
    .map(feature => feature?.geometry?.coordinates)
    .filter(value => (
      Array.isArray(value)
      && Number.isFinite(value[0])
      && Number.isFinite(value[1])
    ));
  if (!coordinates.length) return null;
  const lngs = coordinates.map(([lng]) => lng);
  const lats = coordinates.map(([, lat]) => lat);
  let west = Math.min(...lngs);
  let east = Math.max(...lngs);
  let south = Math.min(...lats);
  let north = Math.max(...lats);
  if (west === east) {
    west -= 0.005;
    east += 0.005;
  }
  if (south === north) {
    south -= 0.005;
    north += 0.005;
  }
  return [west, south, east, north];
};
