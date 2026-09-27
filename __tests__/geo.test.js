import {
  boundsOf,
  haversineKm,
  projectOntoTrail,
  totalDistanceKm,
  trailCoordinates,
} from '../src/core/utils/geo.jsx';

const trail = {
  geometry: {
    type: 'LineString',
    coordinates: [
      [125.0, 7.0],
      [125.01, 7.0],
      [125.02, 7.0],
    ],
  },
};

describe('geo utilities', () => {
  test('converts GeoJSON longitude-latitude pairs to app coordinates', () => {
    expect(trailCoordinates(trail)).toEqual([
      { lat: 7.0, lng: 125.0 },
      { lat: 7.0, lng: 125.01 },
      { lat: 7.0, lng: 125.02 },
    ]);
  });

  test('computes stable haversine distances', () => {
    expect(haversineKm({ lat: 7, lng: 125 }, { lat: 7, lng: 125 })).toBe(0);
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.19, 1);
  });

  test('sums route distance and calculates bounds', () => {
    const points = trailCoordinates(trail);

    expect(totalDistanceKm(points)).toBeGreaterThan(2);
    expect(boundsOf(points)).toEqual({
      minLat: 7,
      maxLat: 7,
      minLng: 125,
      maxLng: 125.02,
    });
  });

  test('projects a fix onto the nearest saved waypoint and reports progress', () => {
    const projection = projectOntoTrail(trail, { lat: 7, lng: 125.0101 });

    expect(projection.closestIndex).toBe(1);
    expect(projection.distanceToTrailM).toBeLessThan(20);
    expect(projection.progress).toBeCloseTo(0.5, 1);
  });

  test('handles empty trail geometry safely', () => {
    const projection = projectOntoTrail(
      { geometry: { type: 'LineString', coordinates: [] } },
      { lat: 7, lng: 125 },
    );

    expect(projection).toEqual({
      closestIndex: 0,
      distanceToTrailM: Number.POSITIVE_INFINITY,
      progress: 0,
    });
  });
});
