import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import boundaries from '../src/data/assets/davaoDelNorteMunicipalities.json';

const builder = resolve(__dirname, '../scripts/prepare-routing-graph.mjs');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'lakbai-routing-build-'));
const sourcePath = join(temporaryDirectory, 'roads.geojson');
const outputPath = join(temporaryDirectory, 'graph.json');
const feature = (id, coordinates) => ({
  type: 'Feature', properties: { highway: 'residential', osm_id: id },
  geometry: { type: 'LineString', coordinates },
});
const roads = [
  feature('panabo-carmen', [[125.68, 7.30], [125.70, 7.36]]),
  feature('carmen-tagum', [[125.70, 7.36], [125.80, 7.45]]),
  feature('samal', [[125.73, 7.10], [125.74, 7.11]]),
];
const run = (...args) => {
  const result = spawnSync(process.execPath, [
    builder, '--source=' + sourcePath, '--output=' + outputPath, ...args,
  ], { encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
};

beforeEach(() => {
  writeFileSync(sourcePath, '{"type":"FeatureCollection","features":[\n' + roads.map(road => JSON.stringify(road)).join(',\n') + '\n]}');
});
afterAll(() => {
  for (const file of readdirSync(temporaryDirectory)) unlinkSync(join(temporaryDirectory, file));
  rmdirSync(temporaryDirectory);
});

describe('Davao del Norte routing build target', () => {
  test('includes the entire boundary extent and keeps mainland and island roads distinct', () => {
    const result = run('--region=davao-del-norte', '--source-exported-at=2026-09-01');
    expect(result.status).toBe(0);
    const graph = JSON.parse(readFileSync(outputPath, 'utf8'));
    expect(graph.meta.id).toBe('davao-del-norte-routing');
    expect(graph.meta.sourceExportedAt).toBe('2026-09-01');
    expect(graph.meta.coverage.validationStatus).toBe('unverified');
    expect(graph.meta.coverage.intendedAreas).toHaveLength(11);
    expect(graph.meta.coverage.intendedAreas.map(area => area.name).sort()).toEqual(
      boundaries.features.map(item => item.properties.adm3_en).sort(),
    );
    const visit = coordinates => {
      if (typeof coordinates[0] === 'number') {
        expect(coordinates[0]).toBeGreaterThanOrEqual(graph.meta.bounds[0]);
        expect(coordinates[1]).toBeGreaterThanOrEqual(graph.meta.bounds[1]);
        expect(coordinates[0]).toBeLessThanOrEqual(graph.meta.bounds[2]);
        expect(coordinates[1]).toBeLessThanOrEqual(graph.meta.bounds[3]);
      } else coordinates.forEach(visit);
    };
    boundaries.features.forEach(item => visit(item.geometry.coordinates));
    expect(graph.nodes).toHaveLength(5);
    expect(graph.edges).toHaveLength(6);
    const shared = graph.nodes.find(node => node.lng === 125.70 && node.lat === 7.36);
    expect(graph.edges.filter(edge => edge.from === shared.id)).toHaveLength(2);
    const islandIds = new Set(graph.nodes.filter(node => node.lat < 7.2).map(node => node.id));
    expect(graph.edges.every(edge => islandIds.has(edge.from) === islandIds.has(edge.to))).toBe(true);
  });

  test.each([
    ['--region=davao-del-norte'],
    ['--region=davao-del-norte', '--source-exported-at=unknown'],
    ['--region=davao-del-norte', '--source-exported-at=2026-09-01', '--bounds=125.65,7.245,125.705,7.325'],
    ['--region=unknown'],
  ])('rejects ambiguous or misleading provincial builds: %s', (...args) => {
    writeFileSync(outputPath, 'keep existing graph');
    expect(run(...args).status).not.toBe(0);
    expect(readFileSync(outputPath, 'utf8')).toBe('keep existing graph');
  });

  test('keeps the Panabo command compatible and rejects an empty export before writing', () => {
    expect(run().status).toBe(0);
    expect(JSON.parse(readFileSync(outputPath, 'utf8')).meta.id).toBe('panabo-routing-pilot');
    writeFileSync(sourcePath, '{"type":"FeatureCollection","features":[]}');
    writeFileSync(outputPath, 'keep existing graph');
    const result = run('--region=davao-del-norte', '--source-exported-at=2026-09-01');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('No routable road features');
    expect(readFileSync(outputPath, 'utf8')).toBe('keep existing graph');
  });
});
