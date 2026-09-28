import panaboGraph from '../src/data/assets/panaboRoutingGraph.json';
import { calculateOfflineRoute } from '../src/domain/usecases/offlineNavigation.jsx';

describe('Panabo routing pilot asset', () => {
  test('ships a connected walking graph from Panabo city center to the mangrove park', () => {
    expect(panaboGraph.meta).toEqual(expect.objectContaining({
      id: 'panabo-routing-pilot',
      sourceExportedAt: '2026-05-05T21:53:31Z',
      license: 'ODbL 1.0',
    }));
    expect(panaboGraph.nodes.length).toBeGreaterThan(10000);
    expect(panaboGraph.edges.length).toBeGreaterThan(20000);

    const route = calculateOfflineRoute({
      graph: panaboGraph,
      from: { lat: 7.2999, lng: 125.6807 },
      to: { lat: 7.272383, lng: 125.680829 },
      mode: 'walk',
      maxSnapDistanceKm: 1,
    });

    expect(route.ok).toBe(true);
    expect(route.distanceKm).toBeGreaterThan(3);
    expect(route.distanceKm).toBeLessThan(5);
    expect(route.startSnap.distanceKm).toBeLessThan(0.05);
    expect(route.endSnap.distanceKm).toBeLessThan(0.01);
  });

  test('ships a connected driving graph to the Panabo mangrove park area', () => {
    const route = calculateOfflineRoute({
      graph: panaboGraph,
      from: { lat: 7.2999, lng: 125.6807 },
      to: { lat: 7.272383, lng: 125.680829 },
      mode: 'drive',
      maxSnapDistanceKm: 1,
    });

    expect(route.ok).toBe(true);
    expect(route.mode).toBe('drive');
    expect(route.distanceKm).toBeGreaterThan(3);
    expect(route.distanceKm).toBeLessThan(6);
    expect(route.durationMin).toBeLessThan(20);
    expect(route.endSnap.distanceKm).toBeLessThan(0.2);
  });

  test('routes offline to a curated Panabo city point of interest', () => {
    const route = calculateOfflineRoute({
      graph: panaboGraph,
      from: { lat: 7.2999, lng: 125.6807 },
      to: { lat: 7.3048, lng: 125.6789 },
      mode: 'walk',
      maxSnapDistanceKm: 1,
      targetLabel: 'Panabo Public Market',
    });

    expect(route.ok).toBe(true);
    expect(route.distanceKm).toBeGreaterThan(0);
    expect(route.distanceKm).toBeLessThan(2);
    expect(route.maneuvers.at(-1).instruction).toBe('Arrive at Panabo Public Market');
    expect(route.endSnap.distanceKm).toBeLessThan(0.2);
  });
});
