const inRing = (point, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i]; const [x2, y2] = ring[j];
    if ((y > point.lat) !== (y2 > point.lat)
      && point.lng < (x2 - x) * (point.lat - y) / (y2 - y) + x) inside = !inside;
  }
  return inside;
};
export const pointInBoundary = (point, geometry) => {
  if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lng)) return false;
  const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  return polygons.some(rings => inRing(point, rings[0]) && !rings.slice(1).some(ring => inRing(point, ring)));
};
export const pointInBounds = (point, bounds) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng)
  && point.lng >= bounds[0] && point.lat >= bounds[1] && point.lng <= bounds[2] && point.lat <= bounds[3];

// Administrative polygons are simplified near the coast. A small road-sample
// index disambiguates nearby mainland/island origins without loading both graphs.
export const regionForPosition = (point, coverage) => {
  const bounds = coverage.provinceBounds ?? coverage.regions?.mainland?.bounds;
  if (!bounds || !pointInBounds(point, bounds)) return null;
  let nearest = null;
  let distance = 0.015 ** 2;
  const cosine = Math.cos(point.lat * Math.PI / 180);
  for (const [lng, lat, island] of coverage.regionSelectionPoints ?? []) {
    const squared = ((lng - point.lng) * cosine) ** 2 + (lat - point.lat) ** 2;
    if (squared < distance) { distance = squared; nearest = island ? 'samal' : 'mainland'; }
  }
  return nearest ?? (pointInBoundary(point, coverage.samalBoundary) ? 'samal' : 'mainland');
};
