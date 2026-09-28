const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const fingerprint = content => createHash('sha256').update(content).digest('hex');
const runtimeSourceSha256 = {};
const babel = require('@babel/core');
require.extensions['.jsx'] = (module, filename) => {
  runtimeSourceSha256[path.relative(process.cwd(), filename).replace(/\\/g, '/')] = fingerprint(fs.readFileSync(filename));
  const transformed = babel.transformFileSync(filename, {
    babelrc: false, configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  module._compile(transformed.code, filename);
};
const { nodePassageAllowed } = require(path.resolve('src/core/routing/accessRules.jsx'));
const { compactNodes, COMPACT_GRAPH_FORMAT } = require(path.resolve('src/core/routing/compactGraph.jsx'));
const { calculateOfflineRoute } = require(path.resolve('src/domain/usecases/offlineNavigation.jsx'));
const arg = name => process.argv.find(value => value.startsWith('--' + name + '='))?.split('=').slice(1).join('=');
const graphPath = arg('graph');
const auditPath = arg('report');
if (!graphPath || !auditPath) throw new Error('Pass --graph=<candidate.json> and --report=<audit.json>');
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const loadGraph = () => {
  const content = fs.readFileSync(graphPath);
  return { graph: JSON.parse(content), sha256: fingerprint(content), bytes: content.length };
};
const { graph, sha256, bytes } = loadGraph();
if ((graph.sourceGraphSha256 ?? sha256) !== audit.graphSha256) throw new Error('Graph does not match the geographic audit; regenerate that audit first');
const memory = () => Object.fromEntries(Object.entries(process.memoryUsage()).map(([key,value]) => [key, Math.round(value / 1024 / 1024)]));
if (global.gc) global.gc();
const memoryAfterLoadMiB = memory();
const nodePassage = { barrierNodes: 0, blockedThroughNodes: { walk: 0, drive: 0 } };
for (const node of graph.format === COMPACT_GRAPH_FORMAT ? compactNodes(graph) : graph.nodes) {
  if (node.osmTags?.barrier) nodePassage.barrierNodes += 1;
  for (const mode of ['walk', 'drive']) if (!nodePassageAllowed(node, mode)) nodePassage.blockedThroughNodes[mode] += 1;
}
const pairs = [
  ['City of Panabo', 'City of Tagum'],
  ['City of Tagum', 'Talaingod'],
  ['Asuncion', 'New Corella'],
  ['Santo Tomas', 'Kapalong'],
  ['Carmen', 'Braulio E. Dujali'],
  ['San Isidro', 'City of Tagum'],
  ['City of Panabo', 'Island Garden City of Samal'],
];
const results = [];
let routingPolicy;
for (const mode of ['walk', 'drive']) {
  const areas = audit.modeConnectivity[mode].areas;
  const localPairs = areas.map(area => [area.name, area.name]);
  for (const [start, end] of [...pairs, ...localPairs]) {
    const from = areas.find(area => area.name === start).anchor;
    const targetArea = areas.find(area => area.name === end);
    const to = start === end ? targetArea.sampleDestination : targetArea.anchor;
    const started = performance.now();
    const route = calculateOfflineRoute({ graph, from, to, mode, maxSnapDistanceKm: 0.05 });
    routingPolicy = route.routingPolicy ?? routingPolicy;
    results.push({ mode, sample: start === end ? 'within-municipality' : 'between-municipalities', from: start, to: end, ok: route.ok, reason: route.reason ?? null,
      distanceKm: route.ok ? Math.round(route.distanceKm * 1000) / 1000 : null,
      durationMin: route.durationMin ?? null,
      routeSha256: fingerprint(JSON.stringify({ ok: route.ok, reason: route.reason, nodeIds: route.nodeIds,
        geometry: route.geometry, maneuvers: route.maneuvers, distanceKm: route.distanceKm, durationMin: route.durationMin })),
      desktopCalculationMs: Math.round(performance.now() - started),
    });
  }
}
if (global.gc) global.gc();
audit.desktopRuntime = { graphFormat: graph.format ?? 'legacy-json', graphSha256: sha256, graphBytes: bytes,
  memoryAfterLoadMiB, garbageCollectionRequested: Boolean(global.gc),
  peakResidentMiB: Math.round(process.resourceUsage().maxRSS / 1024),
  nodeVersion: process.version, platform: process.platform,
  runtimeSourceSha256,
  routingPolicy, nodePassage,
  runtimeSourceNote: 'Measured against working-tree routing sources; fingerprints include pending navigation edits.',
  memoryAfterRoutesMiB: memory(),
  includesIndexBuildInFirstRoute: true,
  routes: results,
};
audit.limitations = audit.limitations.map(item => item.includes('not enforced by the current engine')
  ? 'See desktopRuntime.routingPolicy for compiled, conservative conditional and unresolved restrictions; blocked-through nodes are reported separately.' : item);
fs.writeFileSync(arg('output') ?? auditPath, JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify(audit.desktopRuntime, null, 2));
