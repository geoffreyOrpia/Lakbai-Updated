import { aStarRoute } from '../src/core/routing/aStar.jsx';
import { buildRoutingIndex, nearestGraphNode, routeBounds } from '../src/core/routing/graph.jsx';
import { calculateOfflineRoute } from '../src/domain/usecases/offlineNavigation.jsx';

const graph = {
  meta: {
    id: 'fixture',
    bounds: [125, 7, 125.03, 7.02],
  },
  nodes: [
    { id: 'a', lat: 7, lng: 125 },
    { id: 'b', lat: 7, lng: 125.01 },
    { id: 'c', lat: 7, lng: 125.02 },
    { id: 'd', lat: 7.01, lng: 125.01 },
    { id: 'e', lat: 7.01, lng: 125.02 },
  ],
  edges: [
    { from: 'a', to: 'b', distanceKm: 1, walk: true, drive: true, highway: 'residential' },
    { from: 'b', to: 'a', distanceKm: 1, walk: true, drive: true, highway: 'residential' },
    { from: 'b', to: 'c', distanceKm: 1, walk: true, drive: true, highway: 'residential' },
    { from: 'c', to: 'b', distanceKm: 1, walk: true, drive: true, highway: 'residential' },
    { from: 'a', to: 'd', distanceKm: 1.4, walk: true, drive: false, highway: 'path' },
    { from: 'd', to: 'e', distanceKm: 1, walk: true, drive: false, highway: 'path' },
    { from: 'e', to: 'c', distanceKm: 1.4, walk: true, drive: false, highway: 'path' },
  ],
};

describe('offline routing core', () => {
  test('builds adjacency and snaps to a usable graph node', () => {
    const index = buildRoutingIndex(graph);
    expect(index.nodesById.size).toBe(5);
    expect(index.adjacency.get('a')).toHaveLength(2);

    const snap = nearestGraphNode(index, { lat: 7.0001, lng: 125.0001 }, 'walk', 1);
    expect(snap.id).toBe('a');
    expect(snap.distanceKm).toBeLessThan(0.1);
  });

  test('A* finds the shortest accessible walking path', () => {
    const index = buildRoutingIndex(graph);
    const route = aStarRoute(index, 'a', 'c', 'walk');

    expect(route.nodeIds).toEqual(['a', 'b', 'c']);
    expect(route.edges).toHaveLength(2);
  });

  test('drive mode excludes path-only edges', () => {
    const index = buildRoutingIndex(graph);
    const route = aStarRoute(index, 'd', 'c', 'drive');
    expect(route).toBeNull();
  });

  test('returns a route with geometry, distance, and ETA', () => {
    const result = calculateOfflineRoute({
      graph,
      from: { lat: 7.0001, lng: 125.0001 },
      to: { lat: 7.0001, lng: 125.0201 },
      mode: 'walk',
      maxSnapDistanceKm: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.nodeIds).toEqual(['a', 'b', 'c']);
    expect(result.distanceKm).toBeCloseTo(2, 5);
    expect(result.durationMin).toBe(27);
    expect(result.geometry.coordinates).toEqual([
      [125, 7],
      [125.01, 7],
      [125.02, 7],
    ]);
    expect(routeBounds(result.geometry)).toEqual([125, 7, 125.02, 7]);
  });

  test('reports coordinates outside graph coverage instead of inventing a route', () => {
    const result = calculateOfflineRoute({
      graph,
      from: { lat: 8, lng: 126 },
      to: { lat: 7, lng: 125.02 },
      mode: 'walk',
      maxSnapDistanceKm: 0.5,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('outside-coverage');
  });
});
