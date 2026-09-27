import { aStarRoute } from '../src/core/routing/aStar.jsx';
import {
  buildRoutingIndex,
  nearestGraphEdge,
  nearestGraphNode,
  routeBounds,
} from '../src/core/routing/graph.jsx';
import { classifyTurn } from '../src/core/routing/maneuvers.jsx';
import { nextRouteManeuver, projectPositionOntoRoute } from '../src/core/routing/routeProgress.jsx';
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
    { from: 'a', to: 'b', distanceKm: 1, walk: true, drive: true, highway: 'residential', name: 'First Road' },
    { from: 'b', to: 'a', distanceKm: 1, walk: true, drive: true, highway: 'residential', name: 'First Road' },
    { from: 'b', to: 'c', distanceKm: 1, walk: true, drive: true, highway: 'residential', name: 'Second Road' },
    { from: 'c', to: 'b', distanceKm: 1, walk: true, drive: true, highway: 'residential', name: 'Second Road' },
    { from: 'a', to: 'd', distanceKm: 1.4, walk: true, drive: false, highway: 'path' },
    { from: 'd', to: 'e', distanceKm: 1, walk: true, drive: false, highway: 'path' },
    { from: 'e', to: 'c', distanceKm: 1.4, walk: true, drive: false, highway: 'path' },
  ],
};

const turnGraph = {
  meta: { id: 'turn-fixture' },
  nodes: [
    { id: 'a', lat: 7, lng: 125 },
    { id: 'b', lat: 7, lng: 125.01 },
    { id: 'c', lat: 6.99, lng: 125.01 },
  ],
  edges: [
    { from: 'a', to: 'b', distanceKm: 1, walk: true, drive: true, highway: 'residential', name: 'East Road' },
    { from: 'b', to: 'c', distanceKm: 1, walk: true, drive: true, highway: 'residential', name: 'South Road' },
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

  test('projects a position onto the nearest routable road edge', () => {
    const index = buildRoutingIndex(graph);
    const snap = nearestGraphEdge(index, { lat: 7.0002, lng: 125.005 }, 'walk', 1);

    expect(snap).toBeTruthy();
    expect(snap.projected.lat).toBeCloseTo(7, 5);
    expect(snap.projected.lng).toBeCloseTo(125.005, 5);
    expect(snap.fraction).toBeCloseTo(0.5, 1);
    expect(snap.distanceKm).toBeLessThan(0.05);
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

  test('returns route geometry, ETA, and source-derived maneuvers', () => {
    const result = calculateOfflineRoute({
      graph,
      from: { lat: 7, lng: 125 },
      to: { lat: 7, lng: 125.02 },
      mode: 'walk',
      maxSnapDistanceKm: 1,
      targetLabel: 'Test Destination',
    });

    expect(result.ok).toBe(true);
    expect(result.distanceKm).toBeCloseTo(2, 5);
    expect(result.durationMin).toBe(27);
    expect(result.geometry.coordinates).toEqual([
      [125, 7],
      [125.01, 7],
      [125.02, 7],
    ]);
    expect(result.edges.map(edge => edge.name)).toEqual(['First Road', 'Second Road']);
    expect(routeBounds(result.geometry)).toEqual([125, 7, 125.02, 7]);
    expect(result.maneuvers[0].instruction).toBe('Start on First Road');
    expect(result.maneuvers.some(maneuver => maneuver.instruction === 'Continue onto Second Road')).toBe(true);
    expect(result.maneuvers.at(-1).instruction).toBe('Arrive at Test Destination');
  });

  test('routes between projected points instead of jumping to the nearest junctions', () => {
    const result = calculateOfflineRoute({
      graph,
      from: { lat: 7.0002, lng: 125.005 },
      to: { lat: 7.0002, lng: 125.015 },
      mode: 'walk',
      maxSnapDistanceKm: 1,
      targetLabel: 'Mid-block destination',
    });

    expect(result.ok).toBe(true);
    expect(result.distanceKm).toBeCloseTo(1, 5);
    expect(result.geometry.coordinates[0][0]).toBeCloseTo(125.005, 5);
    expect(result.geometry.coordinates[0][1]).toBeCloseTo(7, 5);
    expect(result.geometry.coordinates.at(-1)[0]).toBeCloseTo(125.015, 5);
    expect(result.geometry.coordinates.at(-1)[1]).toBeCloseTo(7, 5);
  });

  test('classifies a right-angle road change as a right turn', () => {
    const result = calculateOfflineRoute({
      graph: turnGraph,
      from: { lat: 7, lng: 125 },
      to: { lat: 6.99, lng: 125.01 },
      mode: 'walk',
      maxSnapDistanceKm: 0.2,
      targetLabel: 'Corner',
    });

    expect(result.ok).toBe(true);
    expect(result.maneuvers.some(maneuver => (
      maneuver.kind === 'right' && maneuver.instruction === 'Turn right onto South Road'
    ))).toBe(true);
    expect(classifyTurn(90)).toBe('right');
    expect(classifyTurn(-90)).toBe('left');
  });

  test('projects live position onto a route and advances to the next maneuver', () => {
    const route = calculateOfflineRoute({
      graph,
      from: { lat: 7, lng: 125 },
      to: { lat: 7, lng: 125.02 },
      mode: 'walk',
      maxSnapDistanceKm: 0.2,
      targetLabel: 'Test Destination',
    });
    const projection = projectPositionOntoRoute(route, { lat: 7.00002, lng: 125.005 });

    expect(projection.distanceToRouteM).toBeLessThan(5);
    expect(projection.progress).toBeGreaterThan(0.2);
    expect(projection.progress).toBeLessThan(0.3);
    expect(projection.remainingKm).toBeGreaterThan(1.4);

    const next = nextRouteManeuver(route, projection.distanceAlongKm);
    expect(next.maneuver).toEqual(expect.objectContaining({
      instruction: 'Continue onto Second Road',
    }));
    expect(next.distanceKm).toBeGreaterThan(0);
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
