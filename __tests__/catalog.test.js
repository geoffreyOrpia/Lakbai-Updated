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
