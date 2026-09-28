import { compactRoutingGraph, compactEdges, compactNodes, validateCompactRoutingGraph } from '../src/core/routing/compactGraph.jsx';
import { buildRoutingIndex, nearestGraphEdge } from '../src/core/routing/graph.jsx';
import { calculateOfflineRoute } from '../src/domain/usecases/offlineNavigation.jsx';
import { BundledRoutingGraphRepository } from '../src/data/repositories/routingGraphRepository.jsx';

const nodes = [
  { id: 'a', lng: 125.6, lat: 7.3, osmTags: { barrier: 'gate', foot: 'yes', motorcar: 'yes' } },
  { id: 'b', lng: 125.62, lat: 7.3 },
  { id: 'c', lng: 125.63, lat: 7.3 },
];
const points = [[125.6, 7.3], [125.61, 7.31], [125.62, 7.3]];
const edge = (id, from, to, coordinates, extras = {}) => ({
  id, from, to, segmentId: 'curve', osmId: '123', name: 'Curved road',
  highway: 'residential', surface: 'asphalt', distanceKm: 3,
  walk: true, drive: true, osmTags: { highway: 'residential', name: 'Curved road' },
  geometry: { type: 'LineString', coordinates }, ...extras,
});
const graph = () => ({
  meta: { id: 'fixture', bounds: [125.5, 7.2, 125.7, 7.4], turnRestrictionsEnforced: false },
  nodes,
  edges: [edge('ab', 'a', 'b', points), edge('ba', 'b', 'a', [...points].reverse(), { drive: false }),
    edge('bc', 'b', 'c', [[125.62, 7.3], [125.63, 7.3]], { segmentId: 'next' })],
  turnRestrictions: [{ id: 'r', tags: { restriction: 'no_left_turn' }, members: [] }],
});

describe('compact routing graphs', () => {
  test('repeated reroutes do not retain earlier virtual endpoints', () => {
    const data = compactRoutingGraph(graph());
    const first = { graph: data, from: { lng: 125.605, lat: 7.305 }, to: { lng: 125.625, lat: 7.3 }, maxSnapDistanceKm: 0.01 };
    const before = calculateOfflineRoute(first);
    calculateOfflineRoute({ ...first, from: { lng: 125.615, lat: 7.305 }, to: nodes[0] });
    const after = calculateOfflineRoute(first);
    expect(after.geometry).toEqual(before.geometry);
    expect(after.distanceKm).toBe(before.distanceKm);
    expect(data.nodes).toHaveLength(3);
  });
  test('retains source tags, restrictions, directions and every curve vertex while sharing tables', () => {
    const original = graph();
    const compact = compactRoutingGraph(original);
    expect(compact.roads).toHaveLength(1);
    expect(compact.segments).toHaveLength(2);
    expect(compact.edges).toHaveLength(3);
    expect(compact.meta).toEqual(original.meta);
    expect(compact.turnRestrictions).toEqual(original.turnRestrictions);
    expect([...compactNodes(compact)]).toEqual(nodes);
    const decoded = [...compactEdges(compact)];
    decoded.forEach((item, i) => {
      expect(item.geometry).toEqual(original.edges[i].geometry);
      expect(item.osmTags).toEqual(original.edges[i].osmTags);
      expect(item.segmentId).toBe(original.edges[i].segmentId);
      expect(item.drive).toBe(original.edges[i].drive);
    });
    expect(decoded[0].geometry).not.toBe(decoded[0].geometry); // expanded geometry is not retained
    expect(decoded[0]._segment).toBe(decoded[1]._segment);
  });

  test.each(['direct', 'easy', 'adventure', 'scenic'])('preserves partial-edge routes and maneuvers for %s', preference => {
    const original = graph();
    for (const mode of ['walk', 'drive']) {
      const options = { from: { lng: 125.605, lat: 7.305 }, to: { lng: 125.625, lat: 7.3 },
        mode, preference, routeAttractors: [{ lng: 125.61, lat: 7.31 }], maxSnapDistanceKm: 0.01 };
      const before = calculateOfflineRoute({ ...options, graph: original });
      const after = calculateOfflineRoute({ ...options, graph: compactRoutingGraph(original) });
      expect(after.ok).toBe(true);
      expect(after.geometry).toEqual(before.geometry);
      expect(after.nodeIds).toEqual(before.nodeIds);
      expect(after.maneuvers).toEqual(before.maneuvers);
      expect(after.durationMin).toBe(before.durationMin);
      expect(after.distanceKm).toBeCloseTo(before.distanceKm, 10);
    }
  });

  test('preserves reverse walking permission without creating reverse driving access', () => {
    const compact = compactRoutingGraph(graph());
    const options = { graph: compact, from: { lng: 125.62, lat: 7.3 }, to: { lng: 125.6, lat: 7.3 }, maxSnapDistanceKm: 0.01 };
    expect(calculateOfflineRoute({ ...options, mode: 'walk' }).ok).toBe(true);
    expect(calculateOfflineRoute({ ...options, mode: 'drive' }).reason).toBe('no-route');
  });

  test('shared spatial buckets still filter road permissions', () => {
    const original = graph();
    original.edges[0].drive = false;
    const index = buildRoutingIndex(compactRoutingGraph(original));
    const position = { lng: 125.61, lat: 7.31 };
    expect(nearestGraphEdge(index, position, 'walk', 0.01).edge.segmentId).toBe('curve');
    expect(nearestGraphEdge(index, position, 'drive', 0.01)).toBeNull();
  });

  test.each([
    g => { g.format = 'future-v9'; },
    g => { g.edges[0][0] = 999; },
    g => { g.edges[0][3] = 0; },
    g => { g.edges[0][4] = 9; },
    g => { g.edges[0][5] = -1; },
    g => { g.segments[0][1][0] = 0; },
    g => { g.segments[0][1][2] = 0.1; },
    g => { g.nodes[1][0] = 'a'; },
  ])('rejects malformed data before indexing and falls back when loading a saved pack', async mutate => {
    const data = JSON.parse(JSON.stringify(compactRoutingGraph(graph())));
    mutate(data);
    expect(() => validateCompactRoutingGraph(data)).toThrow();
    const repository = new BundledRoutingGraphRepository(() => JSON.stringify(data));
    expect(await repository.getForDestination('tagum', 'saved.json')).toBeNull();
  });

  test('reads a valid compact saved pack through the existing repository', async () => {
    const data = compactRoutingGraph(graph());
    const repository = new BundledRoutingGraphRepository(() => JSON.stringify(data));
    const saved = await repository.getForDestination('tagum', 'saved.json');
    expect(calculateOfflineRoute({ graph: saved, from: nodes[0], to: nodes[2] }).ok).toBe(true);
  });

  test.each([false, true])('keeps parallel sections of one OSM way distinct (compact=%s)', compact => {
    const original = graph();
    original.edges = [
      edge('ab', 'a', 'b', points),
      edge('ba', 'b', 'a', [...points].reverse()),
      edge('lower', 'a', 'b', [[125.6, 7.3], [125.61, 7.29], [125.62, 7.3]], { segmentId: 'other-arc' }),
    ];
    const route = calculateOfflineRoute({ graph: compact ? compactRoutingGraph(original) : original,
      from: { lng: 125.61, lat: 7.31 }, to: { lng: 125.61, lat: 7.29 }, maxSnapDistanceKm: 0.01 });
    expect(route.ok).toBe(true);
    expect(route.distanceKm).toBeGreaterThan(3);
    expect(route.geometry.coordinates).toContainEqual([125.6, 7.3]);
    const reverse = calculateOfflineRoute({ graph: compact ? compactRoutingGraph(original) : original,
      from: { lng: 125.61, lat: 7.29 }, to: { lng: 125.61, lat: 7.31 }, maxSnapDistanceKm: 0.01 });
    expect(reverse.ok).toBe(true);
    expect(reverse.geometry.coordinates).toContainEqual([125.62, 7.3]);
    expect(reverse.geometry.coordinates).not.toContainEqual([125.6, 7.3]);
  });
});
