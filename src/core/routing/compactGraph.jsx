import { normalizeEdgeGeometry, geometryDistances } from './edgeGeometry.jsx';

export const COMPACT_GRAPH_FORMAT = 'lakbai-routing-compact-v1';
const SCALE = 1e7;
const EDGE_FIELDS = new Set(['id', 'from', 'to', 'geometry', 'distanceKm', 'walk', 'drive', 'segmentId']);
const integerCoordinate = value => Math.round(value * SCALE);
const fail = message => { throw new Error('Invalid compact routing graph: ' + message); };

const unpackCoordinates = packed => {
  const coordinates = [];
  let lng = 0;
  let lat = 0;
  for (let i = 0; i < packed.length; i += 2) {
    lng += packed[i];
    lat += packed[i + 1];
    coordinates.push([lng / SCALE, lat / SCALE]);
  }
  return coordinates;
};

// Build-time encoder. Tables retain tags/restrictions while eliminating repeated
// road attributes and reversed copies of the same physical segment geometry.
export const compactRoutingGraph = graph => {
  const nodes = graph.nodes.map(({ id, lng, lat, ...extra }) => (
    [String(id), integerCoordinate(lng), integerCoordinate(lat), extra]
  ));
  const nodeNumbers = new Map(nodes.map((node, i) => [node[0], i]));
  const roads = [];
  const roadNumbers = new Map();
  const segments = [];
  const segmentNumbers = new Map();
  const edges = graph.edges.map(edge => {
    const from = nodeNumbers.get(String(edge.from));
    const to = nodeNumbers.get(String(edge.to));
    if (from == null || to == null) fail('unknown endpoint');
    const geometry = normalizeEdgeGeometry(edge.geometry, graph.nodes[from], graph.nodes[to]);
    if (!geometry || !edge.segmentId) fail('encoder requires imported segment identities and geometry');
    const road = Object.fromEntries(Object.entries(edge).filter(([key]) => !EDGE_FIELDS.has(key)));
    const roadKey = JSON.stringify(road);
    if (!roadNumbers.has(roadKey)) {
      roadNumbers.set(roadKey, roads.length);
      roads.push(road);
    }
    const reversed = from > to;
    const points = reversed ? [...geometry.coordinates].reverse() : geometry.coordinates;
    let lng = 0;
    let lat = 0;
    const packed = points.flatMap(point => {
      const nextLng = integerCoordinate(point[0]);
      const nextLat = integerCoordinate(point[1]);
      const delta = [nextLng - lng, nextLat - lat];
      lng = nextLng;
      lat = nextLat;
      return delta;
    });
    const segmentKey = JSON.stringify([edge.segmentId, packed]);
    if (!segmentNumbers.has(segmentKey)) {
      segmentNumbers.set(segmentKey, segments.length);
      segments.push([edge.segmentId, packed]);
    }
    const segment = (segmentNumbers.get(segmentKey) + 1) * (reversed ? -1 : 1);
    return [from, to, roadNumbers.get(roadKey), segment,
      (edge.walk !== false ? 1 : 0) | (edge.drive !== false ? 2 : 0),
      geometryDistances(geometry.coordinates).at(-1), edge.id ?? null];
  });
  const result = { format: COMPACT_GRAPH_FORMAT, meta: graph.meta, nodes, roads, segments, edges,
    turnRestrictions: graph.turnRestrictions ?? [] };
  validateCompactRoutingGraph(result);
  return result;
};

const validated = new WeakSet();
export const validateCompactRoutingGraph = graph => {
  if (validated.has(graph)) return graph;
  if (graph?.format !== COMPACT_GRAPH_FORMAT) fail('unsupported format');
  if (!['nodes', 'roads', 'segments', 'edges', 'turnRestrictions'].every(key => Array.isArray(graph[key]))) fail('missing tables');
  if (!graph.nodes.length || !graph.edges.length) fail('empty graph');
  const ids = new Set();
  for (const node of graph.nodes) {
    if (!Array.isArray(node) || node.length !== 4 || typeof node[0] !== 'string' || ids.has(node[0])
      || !Number.isSafeInteger(node[1]) || Math.abs(node[1]) > 180 * SCALE
      || !Number.isSafeInteger(node[2]) || Math.abs(node[2]) > 90 * SCALE
      || !node[3] || typeof node[3] !== 'object' || Array.isArray(node[3])) fail('node');
    ids.add(node[0]);
  }
  for (const road of graph.roads) {
    if (!road || typeof road !== 'object' || Array.isArray(road)
      || Object.keys(road).some(key => EDGE_FIELDS.has(key) || key.startsWith('_'))) fail('road attributes');
  }
  const endpoints = graph.segments.map(segment => {
    if (!Array.isArray(segment) || segment.length !== 2 || typeof segment[0] !== 'string'
      || !Array.isArray(segment[1]) || segment[1].length < 4 || segment[1].length % 2) fail('segment');
    let lng = 0;
    let lat = 0;
    const packed = segment[1];
    for (let i = 0; i < packed.length; i += 2) {
      if (!Number.isSafeInteger(packed[i]) || !Number.isSafeInteger(packed[i + 1])) fail('coordinate');
      lng += packed[i];
      lat += packed[i + 1];
      if (Math.abs(lng) > 180 * SCALE || Math.abs(lat) > 90 * SCALE) fail('coordinate range');
    }
    return [packed[0], packed[1], lng, lat];
  });
  const ref = (value, table) => Number.isInteger(value) && value >= 0 && value < table.length;
  for (const edge of graph.edges) {
    if (!Array.isArray(edge) || edge.length !== 7 || !ref(edge[0], graph.nodes) || !ref(edge[1], graph.nodes)
      || !ref(edge[2], graph.roads) || !Number.isInteger(edge[3]) || !ref(Math.abs(edge[3]) - 1, graph.segments)
      || ![1, 2, 3].includes(edge[4]) || !Number.isFinite(edge[5]) || edge[5] <= 0) fail('edge');
    const a = graph.nodes[edge[0]];
    const b = graph.nodes[edge[1]];
    const [lng1, lat1, lng2, lat2] = endpoints[Math.abs(edge[3]) - 1];
    const expected = edge[3] > 0 ? [lng1, lat1, lng2, lat2] : [lng2, lat2, lng1, lat1];
    if (a[1] !== expected[0] || a[2] !== expected[1] || b[1] !== expected[2] || b[2] !== expected[3]) fail('geometry endpoints');
  }
  validated.add(graph);
  return graph;
};

class CompactEdge {
  constructor(graph, row) {
    Object.assign(this, graph.roads[row[2]]);
    this.from = graph.nodes[row[0]][0];
    this.to = graph.nodes[row[1]][0];
    this.walk = Boolean(row[4] & 1);
    this.drive = Boolean(row[4] & 2);
    this.distanceKm = row[5];
    this.id = row[6];
    this._segment = graph.segments[Math.abs(row[3]) - 1];
    this._reversed = row[3] < 0;
    this.segmentId = this._segment[0];
  }

  get geometry() {
    const coordinates = unpackCoordinates(this._segment[1]);
    if (this._reversed) coordinates.reverse();
    return { type: 'LineString', coordinates };
  }
}

export function* compactNodes(graph) {
  for (const [id, lng, lat, extra] of graph.nodes) yield { ...extra, id, lng: lng / SCALE, lat: lat / SCALE };
}

export function* compactEdges(graph) {
  for (const row of graph.edges) yield new CompactEdge(graph, row);
}
