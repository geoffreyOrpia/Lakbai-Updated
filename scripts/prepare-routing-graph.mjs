import { createReadStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { directedRoadPermissions, roadPermissions } from './osm-road-rules.mjs';
import { createInterface } from 'node:readline';
import { dirname, resolve } from 'node:path';
import { routingBuildTarget } from './routing-build-targets.mjs';

const DEFAULT_BOUNDS = [125.650, 7.245, 125.705, 7.325];
const argValue = name => {
  const prefix = '--' + name + '=';
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
};

const target = routingBuildTarget(argValue('region'));
const metadataArg = argValue('source-metadata');
const sourceMeta = metadataArg ? JSON.parse(readFileSync(resolve(metadataArg), 'utf8')) : null;
if (sourceMeta && (sourceMeta.format !== 'lakbai-osm-roads-v1' || sourceMeta.region !== 'davao-del-norte')) {
  throw new Error('Unsupported OSM source metadata');
}
const sourceArg = argValue('source')
  ?? process.env.LAKBAI_ROUTING_SOURCE;
const outputArg = argValue('output')
  ?? target?.output ?? 'src/data/assets/panaboRoutingGraph.json';
const graphId = argValue('id') ?? target?.id ?? 'panabo-routing-pilot';
const graphName = argValue('name') ?? target?.name ?? 'Panabo City walking/road routing pilot';
const sourceDataset = argValue('source-dataset') ?? sourceMeta?.sourceDataset ?? 'HOT OSM Philippines Roads';
const sourceExportedAt = argValue('source-exported-at')
  ?? sourceMeta?.sourceExportedAt ?? (target ? null : '2026-05-05T21:53:31Z');
const sourceAttribution = argValue('source-attribution')
  ?? sourceMeta?.source ?? 'Humanitarian OpenStreetMap Team / OpenStreetMap contributors';
const license = argValue('license') ?? sourceMeta?.license ?? 'ODbL 1.0';
const boundsArg = argValue('bounds');
const bounds = boundsArg
  ? boundsArg.split(',').map(Number)
  : sourceMeta?.bounds ?? target?.bounds ?? DEFAULT_BOUNDS;

if (!sourceArg) {
  console.error('Missing road GeoJSON. Pass --source=<HOT OSM roads GeoJSON> or set LAKBAI_ROUTING_SOURCE.');
  process.exit(1);
}
if (target && boundsArg) {
  console.error('A province build uses the complete province extent. Omit --bounds, or omit --region for a custom-area build.');
  process.exit(1);
}
if (target && (!sourceExportedAt || !Number.isFinite(Date.parse(sourceExportedAt)))) {
  console.error('Province builds require a valid --source-exported-at date from the road dataset.');
  process.exit(1);
}
if (bounds.length !== 4 || bounds.some(value => !Number.isFinite(value))
  || bounds[0] >= bounds[2] || bounds[1] >= bounds[3]) {
  console.error('Bounds must be west,south,east,north.');
  process.exit(1);
}
if (!graphId.trim() || !graphName.trim()) {
  console.error('Routing graph --id and --name must not be empty.');
  process.exit(1);
}

const sourcePath = resolve(sourceArg);
if (sourceMeta) {
  if (target && (bounds[0] > target.bounds[0] || bounds[1] > target.bounds[1]
    || bounds[2] < target.bounds[2] || bounds[3] < target.bounds[3])) {
    throw new Error('OSM source extent must cover the complete province');
  }
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(sourcePath)) hash.update(chunk);
  if (hash.digest('hex') !== sourceMeta.roadsSha256) throw new Error('Road source SHA-256 mismatch');
}
const outputPath = resolve(outputArg);
const [west, south, east, north] = bounds;
const nodes = [];
const edges = [];
const nodeIds = new Map();
const edgeKeys = new Set();
let includedFeatures = 0;
const nodeUses = new Map();
if (sourceMeta) {
  const lines = createInterface({ input: createReadStream(sourcePath, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const feature = JSON.parse(line);
    for (const id of feature.properties?.osm_node_ids ?? []) nodeUses.set(id, (nodeUses.get(id) ?? 0) + 1);
  }
}
const restrictionViaNodes = new Set((sourceMeta?.restrictions ?? []).flatMap(relation => (
  relation.members.filter(member => member.type === 'n' && member.role === 'via').map(member => member.ref)
)));

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

const ensureNode = (coordinate, osmNodeId = null) => {
  const key = osmNodeId != null ? 'osm:' + osmNodeId : coordinateKey(coordinate);
  let id = nodeIds.get(key);
  if (id) return id;
  id = osmNodeId != null ? 'osm:' + osmNodeId : `n${nodes.length}`;
  nodeIds.set(key, id);
  nodes.push({
    id,
    lng: Number(coordinate[0]),
    lat: Number(coordinate[1]),
    ...(sourceMeta?.nodeTags?.[osmNodeId] ? { osmTags: sourceMeta.nodeTags[osmNodeId] } : {}),
  });
  return id;
};

const roadName = properties => (
  properties.name
  ?? properties['name:en']
  ?? properties['name:fil']
  ?? null
);

const addEdge = (from, to, data) => {
  const key = `${from}>${to}:${data.osmId}:${data.segmentId ?? ""}`;
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
  const { walk, drive } = roadPermissions(properties);
  if (!walk && !drive) return;

  const name = roadName(properties);
  const osmId = String(properties.osm_id ?? '');
  const refs = properties.osm_node_ids;
  if (sourceMeta && (!Array.isArray(refs) || refs.length !== geometry.coordinates.length
    || refs.some(id => typeof id !== 'string' || !/^\d+$/.test(id)))) {
    throw new Error('Imported OSM way has missing or invalid node identities: ' + osmId);
  }
  let used = false;
  const loopBreaks = new Set();
  const firstOccurrence = new Map();
  for (const [index, ref] of (refs ?? []).entries()) {
    if (firstOccurrence.has(ref)) {
      const first = firstOccurrence.get(ref);
      if (index > first + 1) loopBreaks.add(first + 1);
    } else firstOccurrence.set(ref, index);
  }

  let segmentStart = 0;
  let segmentKm = 0;
  for (let index = 1; index < geometry.coordinates.length; index += 1) {
    const a = geometry.coordinates[index - 1];
    const b = geometry.coordinates[index];
    if (!segmentTouchesBounds(a, b)) {
      segmentStart = index;
      segmentKm = 0;
      continue;
    }
    segmentKm += haversineKm(a, b);
    const atEnd = index === geometry.coordinates.length - 1;
    const nextOutside = !atEnd && !segmentTouchesBounds(b, geometry.coordinates[index + 1]);
    const loopSplit = sourceMeta && loopBreaks.has(index);
    const junction = sourceMeta && ((nodeUses.get(refs[index]) ?? 0) > 1
      || sourceMeta.nodeTags?.[refs[index]] || restrictionViaNodes.has(refs[index]));
    if (sourceMeta && !atEnd && !nextOutside && !loopSplit && !junction) continue;
    const aId = ensureNode(geometry.coordinates[segmentStart], refs?.[segmentStart]);
    const bId = ensureNode(b, refs?.[index]);
    if (aId === bId) {
      segmentStart = index;
      segmentKm = 0;
      continue;
    }
    const data = {
      distanceKm: segmentKm,
      ...(sourceMeta ? {
        segmentId: osmId + ':' + segmentStart + ':' + index,
        geometry: { type: 'LineString', coordinates: geometry.coordinates.slice(segmentStart, index + 1) },
      } : {}),
      highway,
      name,
      surface: properties.surface ?? null,
      walk,
      drive,
      osmId,
      ...(sourceMeta ? { osmTags: Object.fromEntries(Object.entries(properties).filter(([key]) => !key.startsWith('osm_'))) } : {}),
    };

    const forward = directedRoadPermissions(properties, true);
    const reverse = directedRoadPermissions(properties, false);
    if (forward.walk || forward.drive) addEdge(aId, bId, { ...data, ...forward });
    if (reverse.walk || reverse.drive) addEdge(bId, aId, {
      ...data, ...reverse,
      ...(data.geometry ? { geometry: { type: 'LineString', coordinates: [...data.geometry.coordinates].reverse() } } : {}),
    });
    used = true;
    segmentStart = index;
    segmentKm = 0;
  }

  if (used) includedFeatures += 1;
};

const input = createInterface({
  input: createReadStream(sourcePath, { encoding: 'utf8' }),
  crlfDelay: Infinity,
});

for await (const rawLine of input) {
  const line = rawLine.trim();
  if (!/^\{\s*"type"\s*:\s*"Feature"\s*,/.test(line)) continue;
  const json = line.endsWith(',') ? line.slice(0, -1) : line;
  processFeature(JSON.parse(json));
}

if (!nodes.length || !edges.length) {
  console.error('No routable road features were found. Check coverage and use a HOT-style GeoJSON export with one Feature per line.');
  process.exit(1);
}

const graph = {
  meta: {
    id: graphId,
    name: graphName,
    format: 1,
    bounds,
    ...(target ? { coverage: target.coverage } : {}),
    source: sourceAttribution,
    sourceDataset,
    sourceExportedAt,
    ...(sourceMeta ? {
      sourceUrl: sourceMeta.sourceUrl,
      sourceSha256: sourceMeta.sourceSha256,
      roadsSha256: sourceMeta.roadsSha256,
      boundaryBufferKm: sourceMeta.bufferKm,
      nodeIdentity: 'osm-node-id',
      geometryModel: 'junction-edges-with-source-vertices',
      turnRestrictionsEnforced: false,
    } : {}),
    license,
    modes: ['walk', 'drive'],
    limitations: [
      'Road data is limited to source segments touching the build bounds; bounds alone do not establish connected or validated coverage.',
      'Ferry crossings are not generated by this road-only builder; disconnected islands remain disconnected.',
      sourceMeta
        ? 'OSM tags and turn restrictions are preserved. Turn relations and node barriers are not yet enforced by the routing engine; this graph is an unverified build candidate.'
        : 'This HOT export does not include every OSM access restriction tag, so real-world closures and private access must still be obeyed.',
      'Private, destination-only, customer-only and conditional access are conservatively excluded from general through-routing.',
      'Walking defaults exclude motorway/trunk classes; explicit mode-access tags override class defaults.',
    ],
  },
  nodes,
  edges,
  ...(sourceMeta ? { turnRestrictions: sourceMeta.restrictions ?? [] } : {}),
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
