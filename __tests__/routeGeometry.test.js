import { buildRoutingIndex, nearestGraphEdge } from '../src/core/routing/graph.jsx';
import { haversineKm } from '../src/core/utils/geo.jsx';
import { calculateOfflineRoute } from '../src/domain/usecases/offlineNavigation.jsx';
import { placesAlongRoute, projectPositionOntoRoute } from '../src/core/routing/routeProgress.jsx';

const coordinates = [[125, 7], [125, 7.01], [125.01, 7.01], [125.01, 7]];
const point = ([lng, lat]) => ({ lng, lat });
const lengthKm = points => points.slice(1).reduce((sum, coordinate, index) => (
  sum + haversineKm(point(points[index]), point(coordinate))
), 0);
const graphFor = (reverse = true) => ({
  nodes: [{ id: 'a', ...point(coordinates[0]) }, { id: 'b', ...point(coordinates.at(-1)) }],
  edges: [
    {
      from: 'a', to: 'b', name: 'Bend Road', highway: 'residential', osmId: 'bend',
      walk: true, drive: true, distanceKm: 1,
      geometry: { type: 'LineString', coordinates },
    },
    ...(reverse ? [{
      from: 'b', to: 'a', name: 'Bend Road', highway: 'residential', osmId: 'bend',
      walk: true, drive: true, distanceKm: 1,
      geometry: { type: 'LineString', coordinates: [...coordinates].reverse() },
    }] : []),
  ],
});
const calculate = (from, to, graph = graphFor(), mode = 'walk') => calculateOfflineRoute({
  graph, from: point(from), to: point(to), mode, maxSnapDistanceKm: 0.02,
});
const expectCoordinates = (actual, expected) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((coordinate, index) => {
    expect(coordinate[0]).toBeCloseTo(expected[index][0], 7);
    expect(coordinate[1]).toBeCloseTo(expected[index][1], 7);
  });
};

describe('source road edge geometry', () => {
  test('indexes bends outside endpoint bounds and snaps by distance along the curve', () => {
    const index = buildRoutingIndex(graphFor());
    const snap = nearestGraphEdge(index, point([125.005, 7.01001]), 'walk', 0.02);
    expect(snap).not.toBeNull();
    expect(snap.projected.lng).toBeCloseTo(125.005, 7);
    expect(snap.projected.lat).toBeCloseTo(7.01, 7);
    expect(snap.fraction).toBeCloseTo(0.5, 5);
    expect(snap.distanceKm).toBeLessThan(0.002);
    // The endpoint chord is not the road.
    expect(nearestGraphEdge(index, point([125.005, 7]), 'walk', 0.02)).toBeNull();
  });

  test.each(['walk', 'drive'])('renders all source bends and measures their length for %s', mode => {
    const route = calculate(coordinates[0], coordinates.at(-1), graphFor(), mode);
    expect(route.ok).toBe(true);
    expect(route.nodeIds).toHaveLength(2);
    expect(route.geometry.coordinates).toEqual(coordinates);
    expect(route.distanceKm).toBeCloseTo(lengthKm(coordinates), 8);
    expect(route.distanceKm).toBeGreaterThan(3);
    expect(route.maneuvers.map(step => step.kind)).toEqual(['depart', 'arrive']);
    expect(route.maneuvers.at(-1).distanceAlongKm).toBeCloseTo(route.distanceKm, 8);
    const arrival = projectPositionOntoRoute(route, point(coordinates.at(-1)));
    expect(arrival.remainingKm).toBeCloseTo(0, 8);
    expect(arrival.progress).toBeCloseTo(1, 8);
  });

  test.each([false, true])('clips both snapped endpoints without losing bends (reverse=%s)', reverse => {
    const expected = [[125, 7.005], [125, 7.01], [125.01, 7.01], [125.01, 7.005]];
    if (reverse) expected.reverse();
    const route = calculate(expected[0], expected.at(-1));
    expect(route.ok).toBe(true);
    expectCoordinates(route.geometry.coordinates, expected);
    expect(route.distanceKm).toBeCloseTo(lengthKm(expected), 8);
    const projection = projectPositionOntoRoute(route, point(expected[1]));
    expect(projection.distanceToRouteM).toBeLessThan(0.001);
    expect(projection.distanceAlongKm).toBeCloseTo(lengthKm(expected.slice(0, 2)), 8);
    expect(placesAlongRoute(route, [{ id: 'bend-poi', ...point(expected[2]) }])).toHaveLength(1);
  });

  test.each([
    [coordinates[0], [125.005, 7.01], [coordinates[0], coordinates[1], [125.005, 7.01]]],
    [[125.005, 7.01], coordinates.at(-1), [[125.005, 7.01], coordinates[2], coordinates[3]]],
    [coordinates.at(-1), [125.005, 7.01], [coordinates[3], coordinates[2], [125.005, 7.01]]],
    [[125.005, 7.01], coordinates[0], [[125.005, 7.01], coordinates[1], coordinates[0]]],
  ])('clips a route with one endpoint at a graph junction', (from, to, expected) => {
    const route = calculate(from, to);
    expect(route.ok).toBe(true);
    expectCoordinates(route.geometry.coordinates, expected);
    expect(route.distanceKm).toBeCloseTo(lengthKm(expected), 8);
  });

  test('keeps one-way driving restrictions on partial curves', () => {
    const graph = graphFor();
    graph.edges[1].drive = false;
    expect(calculate([125.01, 7.005], [125, 7.005], graph, 'drive').reason).toBe('no-route');
    expect(calculate([125, 7.005], [125.01, 7.005], graph, 'drive').ok).toBe(true);
    expect(calculate([125.01, 7.005], [125, 7.005], graph, 'walk').ok).toBe(true);
  });

  test('handles equal snapped positions and positions on the same curve segment', () => {
    const same = calculate([125.005, 7.01], [125.005, 7.01]);
    expect(same.ok).toBe(true);
    expect(same.distanceKm).toBe(0);
    expect(same.geometry.coordinates.every(coordinate => coordinate.every(Number.isFinite))).toBe(true);
    const short = calculate([125.002, 7.01], [125.008, 7.01]);
    expectCoordinates(short.geometry.coordinates, [[125.002, 7.01], [125.008, 7.01]]);
    expect(short.distanceKm).toBeCloseTo(lengthKm(short.geometry.coordinates), 8);
  });

  test('orients stored geometry, removes duplicate vertices, and does not mutate the pack', () => {
    const graph = graphFor();
    graph.edges[1].geometry.coordinates = [...coordinates, coordinates.at(-1)];
    const before = JSON.stringify(graph);
    const route = calculate(coordinates.at(-1), coordinates[0], graph);
    expectCoordinates(route.geometry.coordinates, [...coordinates].reverse());
    expect(JSON.stringify(graph)).toBe(before);
  });

  test.each([
    undefined,
    { type: 'LineString', coordinates: [[125, 7], [NaN, 7], [125.01, 7]] },
    { type: 'LineString', coordinates: [[124, 6], [124.01, 6]] },
  ])('retains straight-edge compatibility for missing or invalid geometry', geometry => {
    const graph = graphFor(false);
    graph.edges[0].geometry = geometry;
    const route = calculate(coordinates[0], coordinates.at(-1), graph);
    expect(route.ok).toBe(true);
    expect(route.geometry.coordinates).toEqual([coordinates[0], coordinates.at(-1)]);
    expect(route.distanceKm).toBe(1);
  });

  test('uses the local road tangent for junction instructions and deduplicates the junction', () => {
    const graph = graphFor(false);
    graph.nodes.push({ id: 'c', lng: 125.01, lat: 6.99 });
    graph.edges.push({
      from: 'b', to: 'c', distanceKm: 1, walk: true, drive: true,
      highway: 'residential', name: 'South Road',
    });
    const route = calculate(coordinates[0], [125.01, 6.99], graph);
    expect(route.ok).toBe(true);
    expect(route.geometry.coordinates).toEqual([...coordinates, [125.01, 6.99]]);
    expect(route.maneuvers[1].kind).toBe('continue');
    expect(route.maneuvers[1].distanceAlongKm).toBeCloseTo(lengthKm(coordinates), 8);
  });
});
