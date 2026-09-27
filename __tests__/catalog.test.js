import { seedPacks } from '../src/data/local/seed/catalog.jsx';
import { packs as rawPacks } from '../src/data/local/seed/packs.jsx';
import { totalDistanceKm, trailCoordinates } from '../src/core/utils/geo.jsx';

describe('release catalog safety', () => {
  test('does not expose prototype trail geometry as verified release trails', () => {
    for (const pack of seedPacks) {
      expect(pack.trails.every(trail => trail.routeVerified === true)).toBe(true);
      const rawPack = rawPacks.find(candidate => candidate.id === pack.id);
      expect(pack.trails.length + pack.withheldTrailsCount).toBe(rawPack?.trails.length ?? 0);
    }
  });

  test('enables only the source-matched Panabo boardwalk segment for in-app GPS navigation', () => {
    const panabo = seedPacks.find(pack => pack.id === 'panabo');
    const trail = panabo?.trails.find(candidate => candidate.id === 'panabo-mangrove-boardwalk');

    expect(trail).toEqual(expect.objectContaining({
      routeVerified: true,
      distanceKm: 0.214,
      verification: expect.objectContaining({
        geometrySource: 'OpenStreetMap way 641690678 v2',
        license: expect.stringContaining('ODbL'),
      }),
    }));
    expect(trail.geometry.coordinates).toEqual([
      [125.6808807, 7.2723324],
      [125.681503, 7.2719787],
      [125.6816693, 7.2717925],
      [125.6810269, 7.2710674],
    ]);
    expect(totalDistanceKm(trailCoordinates(trail))).toBeCloseTo(0.214, 2);
  });

  test('exposes planning route sequences without prototype coordinates', () => {
    for (const pack of seedPacks) {
      const rawPack = rawPacks.find(candidate => candidate.id === pack.id);
      expect(pack.routeSuggestions).toHaveLength(rawPack?.trails.length ?? 0);
      for (const route of pack.routeSuggestions) {
        expect(route.planningOnly).toBe(true);
        expect(route).not.toHaveProperty('geometry');
        expect(route).not.toHaveProperty('start');
        for (const stop of route.stops) {
          expect(stop).not.toHaveProperty('lat');
          expect(stop).not.toHaveProperty('lng');
        }
      }
    }
  });

  test('marks every destination with source-review status or an explicit prototype label', () => {
    for (const pack of seedPacks) {
      expect(['partial', 'prototype']).toContain(pack.destination.verification.status);
      expect(pack.destination.verification.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (pack.destination.status === 'available') {
        expect(pack.destination.verification.sources.length).toBeGreaterThan(0);
      }
    }
  });

  test('ships only the national emergency hotline until local numbers are reverified', () => {
    for (const pack of seedPacks) {
      expect(pack.safety.emergencyContacts).toEqual([
        expect.objectContaining({
          label: 'National Emergency Hotline',
          phone: '911',
          verified: true,
          sourceLabel: expect.stringContaining('Department of the Interior and Local Government'),
        }),
      ]);
    }
  });
});
