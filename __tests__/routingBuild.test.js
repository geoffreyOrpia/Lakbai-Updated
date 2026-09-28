import { createHash } from 'node:crypto';
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


describe('OSM source import contract', () => {
  const metadataPath = join(temporaryDirectory, 'roads.metadata.json');
  const writeImportedRoads = features => {
    const content = features.map(item => JSON.stringify(item)).join('\n');
    writeFileSync(sourcePath, content);
    writeFileSync(metadataPath, JSON.stringify({
      format: 'lakbai-osm-roads-v1', region: 'davao-del-norte',
      bounds: [125, 6, 127, 9], sourceExportedAt: '2026-09-27T20:23:36Z',
      roadsSha256: createHash('sha256').update(content).digest('hex'),
      nodeTags: { '2': { barrier: 'gate' } },
      restrictions: [{ id: '99', tags: { type: 'restriction', restriction: 'no_left_turn' },
        members: [{ type: 'w', ref: 'way-1', role: 'from' }, { type: 'n', ref: '2', role: 'via' }] }],
    }));
  };
  const road = (id, refs, tags = {}) => ({
    ...feature(id, [[125.68, 7.30], [125.69, 7.31]]),
    properties: { highway: 'residential', osm_id: id, osm_node_ids: refs, ...tags },
  });
  const build = () => run('--region=davao-del-norte', '--source-metadata=' + metadataPath);

  test('preserves node identity, barriers, raw tags, and restriction relations', () => {
    writeImportedRoads([road('way-1', ['1','2'], { bridge: 'yes' }), road('way-2', ['3','4'])]);
    expect(build().status).toBe(0);
    const graph = JSON.parse(readFileSync(outputPath, 'utf8'));
    expect(graph.nodes).toHaveLength(4);
    expect(graph.nodes.find(node => node.id === 'osm:2').osmTags.barrier).toBe('gate');
    expect(graph.edges.filter(edge => edge.osmId === 'way-1').every(edge => edge.osmTags.bridge === 'yes')).toBe(true);
    expect(graph.turnRestrictions[0].tags.restriction).toBe('no_left_turn');
    expect(graph.meta.turnRestrictionsEnforced).toBe(false);
    expect(graph.meta.coverage.validationStatus).toBe('unverified');
  });

  test('honors static access, mode overrides, roundabouts, reverse one-way and walking direction', () => {
    writeImportedRoads([
      road('private', ['1','2'], { access: 'private' }),
      road('public-foot', ['3','4'], { access: 'private', foot: 'yes' }),
      road('circle', ['5','6'], { junction: 'roundabout' }),
      road('reverse', ['7','8'], { oneway: '-1' }),
      road('foot-oneway', ['9','10'], { 'oneway:foot': 'yes' }),
      road('conditional', ['11','12'], { 'access:conditional': 'yes @ (Mo-Fr)' }),
      road('building', ['13','14'], { highway: 'construction' }),
    ]);
    expect(build().status).toBe(0);
    const graph = JSON.parse(readFileSync(outputPath, 'utf8'));
    expect(graph.edges.some(edge => ['private','conditional','building'].includes(edge.osmId))).toBe(false);
    expect(graph.edges.filter(edge => edge.osmId === 'public-foot').every(edge => edge.walk && !edge.drive)).toBe(true);
    expect(graph.edges.find(edge => edge.osmId === 'circle' && edge.from === 'osm:6').drive).toBe(false);
    expect(graph.edges.find(edge => edge.osmId === 'circle' && edge.from === 'osm:5').drive).toBe(true);
    expect(graph.edges.find(edge => edge.osmId === 'reverse' && edge.from === 'osm:7').drive).toBe(false);
    expect(graph.edges.find(edge => edge.osmId === 'reverse' && edge.from === 'osm:8').drive).toBe(true);
    expect(graph.edges.find(edge => edge.osmId === 'foot-oneway' && edge.from === 'osm:10').walk).toBe(false);
  });

  test('compacts shape-only vertices while retaining curves, junctions and loops', () => {
    const curve = [[125.68,7.30],[125.68,7.31],[125.69,7.31],[125.69,7.30]];
    writeImportedRoads([
      { ...road('curve', ['100','101','102','103']), geometry: { type: 'LineString', coordinates: curve } },
      { ...road('junction', ['103','104']), geometry: { type: 'LineString', coordinates: [curve[3],[125.70,7.30]] } },
      { ...road('loop', ['200','201','202','200']), geometry: { type: 'LineString', coordinates: [[125.75,7.30],[125.76,7.31],[125.76,7.30],[125.75,7.30]] } },
      { ...road('attached-loop', ['300','301','302','303','301','304']), geometry: { type: 'LineString', coordinates: [[125.80,7.30],[125.81,7.30],[125.82,7.31],[125.82,7.30],[125.81,7.30],[125.81,7.29]] } },
    ]);
    expect(build().status).toBe(0);
    const graph = JSON.parse(readFileSync(outputPath, 'utf8'));
    expect(graph.nodes.map(node => node.id)).toEqual(expect.arrayContaining(['osm:100','osm:103','osm:104']));
    expect(graph.nodes.some(node => ['osm:101','osm:102'].includes(node.id))).toBe(false);
    const forward = graph.edges.find(edge => edge.osmId === 'curve' && edge.from === 'osm:100');
    const reverse = graph.edges.find(edge => edge.osmId === 'curve' && edge.from === 'osm:103');
    expect(forward.geometry.coordinates).toEqual(curve);
    expect(reverse.geometry.coordinates).toEqual([...curve].reverse());
    expect(forward.distanceKm).toBeGreaterThan(3);
    expect(graph.edges.filter(edge => edge.osmId === 'loop')).toHaveLength(4);
    expect(graph.edges.filter(edge => edge.osmId === 'attached-loop')).toHaveLength(8);
    expect(graph.meta.geometryModel).toBe('junction-edges-with-source-vertices');
  });

  test('rejects changed road files or missing OSM identities without replacing the graph', () => {
    writeImportedRoads([road('way-1', ['1','2'])]);
    writeFileSync(outputPath, 'keep existing graph');
    writeFileSync(sourcePath, readFileSync(sourcePath, 'utf8') + ' ');
    expect(build().stderr).toContain('SHA-256 mismatch');
    expect(readFileSync(outputPath, 'utf8')).toBe('keep existing graph');
    writeImportedRoads([road('way-1', ['1'])]);
    expect(build().stderr).toContain('node identities');
    expect(readFileSync(outputPath, 'utf8')).toBe('keep existing graph');
  });
});
