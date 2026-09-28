import { calculateOfflineRouteAlternatives } from '../src/domain/usecases/routeAlternatives.jsx';

const graph = {
  meta: { id: 'alternatives-fixture' },
  nodes: [
    { id: 'a', lat: 7, lng: 125 },
    { id: 'b', lat: 7, lng: 125.01 },
    { id: 'c', lat: 7.006, lng: 125.01 },
    { id: 'd', lat: 7, lng: 125.02 },
  ],
  edges: [
    { from: 'a', to: 'b', distanceKm: 1, walk: true, drive: true, highway: 'residential', name: 'Direct West' },
    { from: 'b', to: 'd', distanceKm: 1, walk: true, drive: true, highway: 'residential', name: 'Direct East' },
    { from: 'a', to: 'c', distanceKm: 1.2, walk: true, drive: true, highway: 'secondary', name: 'Upper West' },
    { from: 'c', to: 'd', distanceKm: 1.2, walk: true, drive: true, highway: 'secondary', name: 'Upper East' },
  ],
};

describe('offline route alternatives', () => {
  test('returns a distinct practical route through the same policy engine', () => {
    const result = calculateOfflineRouteAlternatives({
      graph,
      from: { lat: 7, lng: 125 },
      to: { lat: 7, lng: 125.02 },
      mode: 'walk',
      maxSnapDistanceKm: 0.2,
    });

    expect(result.primary.ok).toBe(true);
    expect(result.alternatives).toHaveLength(1);
    expect(result.alternatives[0].distanceKm).toBeGreaterThan(result.primary.distanceKm);
    expect(result.alternatives[0].edges.map(edge => edge.name))
      .toEqual(expect.arrayContaining(['Upper West', 'Upper East']));
  });

  test('returns no alternative when the graph only has one legal path', () => {
    const single = {
      meta: { id: 'single-route' },
      nodes: graph.nodes.filter(node => ['a', 'b', 'd'].includes(node.id)),
      edges: graph.edges.filter(edge => edge.name.startsWith('Direct')),
    };
    const result = calculateOfflineRouteAlternatives({
      graph: single,
      from: { lat: 7, lng: 125 },
      to: { lat: 7, lng: 125.02 },
      mode: 'walk',
      maxSnapDistanceKm: 0.2,
    });

    expect(result.primary.ok).toBe(true);
    expect(result.alternatives).toEqual([]);
  });
});
