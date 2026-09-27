import { seedPacks } from '../src/data/local/seed/catalog.jsx';

describe('release catalog safety', () => {
  test('does not expose prototype trail geometry as verified release trails', () => {
    for (const pack of seedPacks) {
      expect(pack.trails.every(trail => trail.routeVerified === true)).toBe(true);
    }
  });

  test('ships only the national emergency hotline until local numbers are reverified', () => {
    for (const pack of seedPacks) {
      expect(pack.safety.emergencyContacts).toEqual([
        expect.objectContaining({ label: 'National Emergency Hotline', phone: '911' }),
      ]);
    }
  });
});
