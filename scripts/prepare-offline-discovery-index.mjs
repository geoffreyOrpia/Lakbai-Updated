import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCALE = 1e7;
const SOURCES = [
  ['mainland', 'Davao del Norte mainland', 'src/data/assets/routing/mainland.routing'],
  ['samal', 'Island Garden City of Samal', 'src/data/assets/routing/samal.routing'],
];
const OUTPUT = path.join(ROOT, 'src/data/assets/discovery/streetIndex.json');
const MUNICIPALITIES = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'src/data/assets/davaoDelNorteMunicipalities.json'),
  'utf8',
));

const textValues = value => String(value ?? '')
  .split(';')
  .map(item => item.trim())
  .filter(Boolean);

const aliasesFor = road => {
  const tags = road.osmTags ?? {};
  return [...new Set([
    ...textValues(road.name),
    ...textValues(tags.alt_name),
    ...textValues(tags.loc_name),
    ...textValues(tags.official_name),
    ...textValues(tags.short_name),
    ...textValues(tags['name:en']),
    ...textValues(tags['name:fil']),
    ...textValues(tags.ref),
  ])];
};

const pointForEdge = (graph, edge) => {
  const from = graph.nodes[edge[0]];
  const to = graph.nodes[edge[1]];
  if (!from || !to) return null;
  return {
    lat: (from[2] + to[2]) / (2 * SCALE),
    lng: (from[1] + to[1]) / (2 * SCALE),
  };
};

const pointInRing = (point, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = ((yi > point.lat) !== (yj > point.lat))
      && point.lng < ((xj - xi) * (point.lat - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

const pointInPolygon = (point, polygon) => (
  polygon?.length > 0
  && pointInRing(point, polygon[0])
  && !polygon.slice(1).some(ring => pointInRing(point, ring))
);

const municipalityForPoint = point => (MUNICIPALITIES.features ?? []).find(feature => {
  const geometry = feature?.geometry;
  if (geometry?.type === 'Polygon') return pointInPolygon(point, geometry.coordinates);
  if (geometry?.type === 'MultiPolygon') {
    return geometry.coordinates.some(polygon => pointInPolygon(point, polygon));
  }
  return false;
}) ?? null;

const entries = [];
for (const [region, regionLabel, relativePath] of SOURCES) {
  const graph = JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
  const seen = new Set();
  for (const edge of graph.edges ?? []) {
    const road = graph.roads?.[edge[2]];
    if (!road?.name) continue;
    const aliases = aliasesFor(road);
    const osmId = String(road.osmId ?? '');
    const key = `${region}:${osmId || road.name}`;
    if (seen.has(key)) continue;
    const point = pointForEdge(graph, edge);
    if (!point) continue;
    const municipality = municipalityForPoint(point);
    if (!municipality) continue;
    seen.add(key);
    entries.push({
      id: `street:${region}:${osmId || entries.length}`,
      name: road.name,
      aliases: aliases.filter(alias => alias !== road.name),
      region,
      regionLabel,
      municipality: municipality.properties?.adm3_en ?? regionLabel,
      highway: road.highway ?? 'road',
      osmId: osmId || null,
      ...point,
    });
  }
}

entries.sort((a, b) => a.name.localeCompare(b.name) || a.region.localeCompare(b.region));
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify({ version: 1, entries }));
console.log(`Wrote ${entries.length} offline street entries to ${path.relative(ROOT, OUTPUT)}`);
