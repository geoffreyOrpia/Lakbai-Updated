const fs = require('node:fs');
const arg = name => process.argv.find(value => value.startsWith('--' + name + '='))?.slice(name.length + 3);
if (!arg('legacy') || !arg('compact') || !arg('output')) throw new Error('Pass --legacy, --compact and --output report paths');
const legacyAudit = JSON.parse(fs.readFileSync(arg('legacy')));
const compactAudit = JSON.parse(fs.readFileSync(arg('compact')));
const legacy = legacyAudit.desktopRuntime;
const compact = compactAudit.desktopRuntime;
if (legacyAudit.graphSha256 !== compactAudit.graphSha256) throw new Error('Different source graphs');
if (JSON.stringify(legacy.runtimeSourceSha256) !== JSON.stringify(compact.runtimeSourceSha256)) throw new Error('Different routing code');
if (legacy.routes.length !== compact.routes.length || !legacy.routes.length) throw new Error('Different route samples');
const samples = legacy.routes.map((before, i) => {
  const after = compact.routes[i];
  for (const field of ['from', 'to', 'mode', 'ok', 'reason', 'distanceKm', 'durationMin', 'routeSha256']) {
    if (before[field] !== after[field] || (field === 'routeSha256' && !before[field])) throw new Error('Route mismatch: ' + before.from + ' / ' + before.to + ' / ' + field);
  }
  return { from: before.from, to: before.to, mode: before.mode, ok: before.ok, reason: before.reason,
    routeSha256: before.routeSha256, legacyMs: before.desktopCalculationMs, compactMs: after.desktopCalculationMs };
});
const metrics = runtime => ({ graphBytes: runtime.graphBytes, graphSha256: runtime.graphSha256,
  memoryAfterLoadMiB: runtime.memoryAfterLoadMiB, memoryAfterRoutesMiB: runtime.memoryAfterRoutesMiB,
  peakResidentMiB: runtime.peakResidentMiB, garbageCollectionRequested: runtime.garbageCollectionRequested });
const report = { status: 'candidate-not-enabled', source: legacyAudit.source, sourceGraphSha256: legacyAudit.graphSha256,
  nodeVersion: compact.nodeVersion, platform: compact.platform, runtimeSourceSha256: compact.runtimeSourceSha256,
  legacy: metrics(legacy), compact: metrics(compact),
  storageReductionPct: Math.round((1 - compact.graphBytes / legacy.graphBytes) * 1000) / 10,
  identicalRouteSamples: samples.length, samples,
  limitations: [
    'Fresh desktop processes using identical working-tree routing code, including pending navigation edits; not mobile measurements.',
    'Retained memory measured after explicit garbage collection. Peak RSS includes parsing, Babel and the audit harness.',
    'Compact format retains the entire province in memory; regional loading remains future work.',
    'Turn restrictions and node barriers are retained but not enforced; candidate remains disabled.',
  ] };
fs.writeFileSync(arg('output'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ identicalRouteSamples: samples.length, storageReductionPct: report.storageReductionPct,
  legacyPeakMiB: legacy.peakResidentMiB, compactPeakMiB: compact.peakResidentMiB }, null, 2));
