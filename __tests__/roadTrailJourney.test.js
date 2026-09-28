import {
  calculateOfflineRoadTrailJourney,
  isOnTrailLeg,
  remainingRoadTrailDurationMin,
} from '../src/domain/usecases/roadTrailJourney.jsx';

const graph = {
  meta: { id: 'road-trail-fixture' },
  nodes: [
    { id: 'a', lat: 7.3, lng: 125.68 },
    { id: 'b', lat: 7.285, lng: 125.6805 },
    { id: 'c', lat: 7.272383, lng: 125.680829 },
  ],
  edges: [
    { from: 'a', to: 'b', distanceKm: 1.7, walk: true, drive: true, highway: 'primary', name: 'Panabo Road' },
    { from: 'b', to: 'a', distanceKm: 1.7, walk: true, drive: true, highway: 'primary', name: 'Panabo Road' },
    { from: 'b', to: 'c', distanceKm: 1.4, walk: true, drive: true, highway: 'residential', name: 'J.P. Laurel Road' },
    { from: 'c', to: 'b', distanceKm: 1.4, walk: true, drive: true, highway: 'residential', name: 'J.P. Laurel Road' },
  ],
};

const trail = {
  id: 'panabo-mangrove-boardwalk',
  name: 'Panabo Mangrove Boardwalk — mapped segment',
  routeVerified: true,
  durationMin: 12,
  start: { name: 'Mapped start', lat: 7.2723324, lng: 125.6808807 },
  geometry: {
    type: 'LineString',
    coordinates: [
      [125.6808807, 7.2723324],
      [125.681503, 7.2719787],
      [125.6810269, 7.2710674],
    ],
  },
  waypoints: [
    { id: 'start', name: 'Mapped start', type: 'start', lat: 7.2723324, lng: 125.6808807 },
    { id: 'end', name: 'Mapped end', type: 'end', lat: 7.2710674, lng: 125.6810269 },
  ],
};

describe('road + verified trail journeys', () => {
  test('builds one continuous road-to-trail route with shared distance and maneuvers', () => {
    const result = calculateOfflineRoadTrailJourney({
      graph,
      from: { lat: 7.2999, lng: 125.6801 },
      trail,
      mode: 'walk',
      maxSnapDistanceKm: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.type).toBe('road-trail-journey');
    expect(result.legs.map(leg => leg.kind)).toEqual(['road', 'trail']);
    expect(result.distanceKm).toBeGreaterThan(result.trailLeg.distanceKm);
    expect(result.durationMin).toBe(result.legs[0].route.durationMin + 12);
    expect(result.maneuvers.some(maneuver => maneuver.kind === 'trail-enter')).toBe(true);
    expect(result.maneuvers.at(-1)).toEqual(expect.objectContaining({
      kind: 'arrive',
      instruction: expect.stringContaining('Panabo Mangrove Boardwalk'),
    }));
    expect(result.finalTarget).toEqual(expect.objectContaining({
      lat: 7.2710674,
      lng: 125.6810269,
    }));
  });

  test('keeps remaining ETA continuous across the road-to-trail transition', () => {
    const result = calculateOfflineRoadTrailJourney({
      graph,
      from: { lat: 7.2999, lng: 125.6801 },
      trail,
      mode: 'walk',
      maxSnapDistanceKm: 1,
    });
    expect(result.ok).toBe(true);

    const atStart = remainingRoadTrailDurationMin(result, 0);
    const atTrailStart = remainingRoadTrailDurationMin(result, result.trailLeg.startKm);
    const halfwayTrail = remainingRoadTrailDurationMin(
      result,
      (result.trailLeg.startKm + result.trailLeg.endKm) / 2,
    );

    expect(atStart).toBeGreaterThan(atTrailStart);
    expect(atTrailStart).toBe(12);
    expect(halfwayTrail).toBeGreaterThan(0);
    expect(halfwayTrail).toBeLessThan(12);
    expect(isOnTrailLeg(result, result.trailLeg.startKm + 0.01)).toBe(true);
  });

  test('rejects unverified and driving trail composition', () => {
    expect(calculateOfflineRoadTrailJourney({
      graph,
      from: { lat: 7.2999, lng: 125.6801 },
      trail: { ...trail, routeVerified: false },
      mode: 'walk',
    })).toEqual({ ok: false, reason: 'trail-unverified' });

    expect(calculateOfflineRoadTrailJourney({
      graph,
      from: { lat: 7.2999, lng: 125.6801 },
      trail,
      mode: 'drive',
    })).toEqual({ ok: false, reason: 'trail-walk-only' });
  });
});
