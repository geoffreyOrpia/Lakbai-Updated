import { seedPacks } from '../src/data/local/seed/catalog.jsx';
import { packs as rawPacks } from '../src/data/local/seed/packs.jsx';

describe('release catalog safety', () => {
  test('does not expose prototype trail geometry as verified release trails', () => {
    for (const pack of seedPacks) {
      expect(pack.trails.every(trail => trail.routeVerified === true)).toBe(true);
      const rawPack = rawPacks.find(candidate => candidate.id === pack.id);
      expect(pack.trails.length + pack.withheldTrailsCount).toBe(rawPack?.trails.length ?? 0);
    }
  });

  test('exposes planning route sequences without prototype coordinates', () => {
    for (const pack of seedPacks) {
      const rawPack = rawPacks.find(candidate => candidate.id === pack.id);
      expect(pack.routeSuggestions).toHaveLength(rawPack?.trails.length ?? 0);
      for (const route of pack.routeSuggestions) {
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
