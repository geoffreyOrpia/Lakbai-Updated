import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, resolve } from 'node:path';

const DEFAULT_BOUNDS = [125.650, 7.245, 125.705, 7.325];
const argValue = name => {
  const prefix = '--' + name + '=';
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
};

const sourceArg = argValue('source')
  ?? process.env.LAKBAI_ROUTING_SOURCE;
const outputArg = argValue('output')
  ?? 'src/data/assets/panaboRoutingGraph.json';
const graphId = argValue('id') ?? 'panabo-routing-pilot';
const graphName = argValue('name') ?? 'Panabo City walking/road routing pilot';
const sourceDataset = argValue('source-dataset') ?? 'HOT OSM Philippines Roads';
const sourceExportedAt = argValue('source-exported-at') ?? '2026-05-05T21:53:31Z';
const sourceAttribution = argValue('source-attribution')
  ?? 'Humanitarian OpenStreetMap Team / OpenStreetMap contributors';
const license = argValue('license') ?? 'ODbL 1.0';
const boundsArg = argValue('bounds');
const bounds = boundsArg
  ? boundsArg.split(',').map(Number)
  : DEFAULT_BOUNDS;

if (!sourceArg) {
  console.error('Missing road GeoJSON. Pass --source=<HOT OSM roads GeoJSON> or set LAKBAI_ROUTING_SOURCE.');
  process.exit(1);
}
if (bounds.length !== 4 || bounds.some(value => !Number.isFinite(value))) {
  console.error('Bounds must be west,south,east,north.');
  process.exit(1);
}
if (!graphId.trim() || !graphName.trim()) {
  console.error('Routing graph --id and --name must not be empty.');
  process.exit(1);
}

const sourcePath = resolve(sourceArg);
const outputPath = resolve(outputArg);
const [west, south, east, north] = bounds;
const nodes = [];
const edges = [];
const nodeIds = new Map();
const edgeKeys = new Set();
let includedFeatures = 0;

const WALK_EXCLUDED = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link']);
const DRIVE_ALLOWED = new Set([
  'motorway', 'motorway_link', 'trunk', 'trunk_link',
  'primary', 'primary_link', 'secondary', 'secondary_link',
  'tertiary', 'tertiary_link', 'unclassified', 'residential',
  'living_street', 'service', 'road',
]);

const haversineKm = (a, b) => {
  const radius = 6371;
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
};

const segmentTouchesBounds = (a, b) => {
  const minLng = Math.min(a[0], b[0]);
  const maxLng = Math.max(a[0], b[0]);
  const minLat = Math.min(a[1], b[1]);
  const maxLat = Math.max(a[1], b[1]);
  return !(maxLng < west || minLng > east || maxLat < south || minLat > north);
};

const coordinateKey = coordinate => `${Number(coordinate[0]).toFixed(7)},${Number(coordinate[1]).toFixed(7)}`;

const ensureNode = coordinate => {
  const key = coordinateKey(coordinate);
  let id = nodeIds.get(key);
  if (id) return id;
  id = `n${nodes.length}`;
  nodeIds.set(key, id);
  nodes.push({
    id,
    lng: Number(coordinate[0]),
    lat: Number(coordinate[1]),
  });
  return id;
};

const roadName = properties => (
  properties.name
  ?? properties['name:en']
  ?? properties['name:fil']
  ?? null
);

const normalizeOneWay = value => {
  const normalized = String(value ?? '').toLowerCase();
  if (['yes', 'true', '1'].includes(normalized)) return 1;
  if (normalized === '-1') return -1;
  return 0;
};

const addEdge = (from, to, data) => {
  const key = `${from}>${to}:${data.osmId}`;
  if (edgeKeys.has(key)) return;
  edgeKeys.add(key);
  edges.push({
    from,
    to,
    ...data,
  });
};

const processFeature = feature => {
  const geometry = feature?.geometry;
  const properties = feature?.properties ?? {};
  if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates)) return;

  const highway = properties.highway;
  if (!highway) return;
  const walk = !WALK_EXCLUDED.has(highway);
  const drive = DRIVE_ALLOWED.has(highway);
  if (!walk && !drive) return;

  const oneway = normalizeOneWay(properties.oneway);
  const name = roadName(properties);
  const osmId = String(properties.osm_id ?? '');
  let used = false;

  for (let index = 1; index < geometry.coordinates.length; index += 1) {
    const a = geometry.coordinates[index - 1];
    const b = geometry.coordinates[index];
    if (!segmentTouchesBounds(a, b)) continue;

    const aId = ensureNode(a);
    const bId = ensureNode(b);
    const data = {
      distanceKm: haversineKm(a, b),
      highway,
      name,
      surface: properties.surface ?? null,
      walk,
      drive,
      osmId,
    };

    if (oneway === -1) {
      addEdge(bId, aId, data);
      if (walk) addEdge(aId, bId, { ...data, drive: false });
    } else {
      addEdge(aId, bId, data);
      if (oneway === 0 || walk) {
        addEdge(bId, aId, {
          ...data,
          drive: oneway === 0 ? drive : false,
        });
      }
    }
    used = true;
  }

  if (used) includedFeatures += 1;
};

const input = createInterface({
  input: createReadStream(sourcePath, { encoding: 'utf8' }),
  crlfDelay: Infinity,
});

for await (const rawLine of input) {
  const line = rawLine.trim();
  if (!line.startsWith('{ "type": "Feature"')) continue;
  const json = line.endsWith(',') ? line.slice(0, -1) : line;
  processFeature(JSON.parse(json));
}

const graph = {
  meta: {
    id: graphId,
    name: graphName,
    format: 1,
    bounds,
    source: sourceAttribution,
    sourceDataset,
    sourceExportedAt,
    license,
    modes: ['walk', 'drive'],
    limitations: [
      'Coverage is limited to the generated graph bounds; routes outside this graph are rejected.',
      'This HOT export does not include every OSM access restriction tag, so real-world closures and private access must still be obeyed.',
      'Walking is disabled on motorway/trunk classes; driving is limited to road classes represented as motor-access candidates in this prototype.',
    ],
  },
  nodes,
  edges,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(graph));
console.log(JSON.stringify({
  output: outputPath,
  id: graphId,
  name: graphName,
  bounds,
  features: includedFeatures,
  nodes: nodes.length,
  edges: edges.length,
  bytes: Buffer.byteLength(JSON.stringify(graph)),
}, null, 2));
