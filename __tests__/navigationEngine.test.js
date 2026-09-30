import {
  advanceNavigationProgress,
  createNavigationEvidence,
} from '../src/domain/navigation/navigationEngine.jsx';

const route = {
  ok: true,
  type: 'road',
  distanceKm: 2.22,
  durationMin: 28,
  geometry: {
    type: 'LineString',
    coordinates: [
      [125.68, 7.30],
      [125.68, 7.29],
      [125.68, 7.28],
    ],
  },
  maneuvers: [
    { id: 'depart', kind: 'depart', instruction: 'Start south', distanceAlongKm: 0 },
    { id: 'continue', kind: 'continue', instruction: 'Continue straight', distanceAlongKm: 1.11 },
    { id: 'arrive', kind: 'arrive', instruction: 'Arrive', distanceAlongKm: 2.22 },
  ],
};

const target = { lat: 7.28, lng: 125.68 };

const advance = ({
  fix,
  evidence = createNavigationEvidence(),
  distanceAlongKm = 0,
  tracking = true,
} = {}) => advanceNavigationProgress({
  route,
  target,
  mode: 'walk',
  tracking,
  distanceAlongKm,
  completedStopCount: 0,
  evidence,
  fix,
});

describe('headless navigation engine', () => {
  test('advances route progress without a mounted navigation screen', () => {
    const first = advance({
      fix: {
        lat: 7.299,
        lng: 125.68,
        accuracy: 5,
        speed: 1.2,
        timestamp: 1_000,
      },
    });
    const second = advance({
      evidence: first.evidence,
      distanceAlongKm: first.patch.distanceAlongKm,
      fix: {
        lat: 7.295,
        lng: 125.68,
        accuracy: 5,
        speed: 1.2,
        timestamp: 3_000,
      },
    });

    expect(first.patch.distanceAlongKm).toBeGreaterThan(0);
    expect(second.patch.distanceAlongKm).toBeGreaterThan(first.patch.distanceAlongKm);
    expect(second.patch.remainingKm).toBeLessThan(first.patch.remainingKm);
    expect(second.guidance?.maneuver).toEqual(expect.objectContaining({ id: 'continue' }));
  });

  test('pauses progress for poor accuracy and rejects stale fixes', () => {
    const first = advance({
      fix: {
        lat: 7.297,
        lng: 125.68,
        accuracy: 5,
        timestamp: 5_000,
      },
    });
    const poor = advance({
      evidence: first.evidence,
      distanceAlongKm: first.patch.distanceAlongKm,
      fix: {
        lat: 7.292,
        lng: 125.68,
        accuracy: 140,
        timestamp: 7_000,
      },
    });
    const stale = advance({
      evidence: poor.evidence,
      distanceAlongKm: first.patch.distanceAlongKm,
      fix: {
        lat: 7.291,
        lng: 125.68,
        accuracy: 5,
        timestamp: 6_000,
      },
    });

    expect(poor.lowAccuracy).toBe(true);
    expect(poor.patch.gpsError).toContain('paused');
    expect(poor.patch.distanceAlongKm).toBeUndefined();
    expect(stale.ignored).toBe(true);
  });

  test('confirms sustained off-route evidence before recommending foreground rerouting', () => {
    let evidence = createNavigationEvidence();
    let distanceAlongKm = 0;
    let result;

    [
      { lat: 7.2990, lng: 125.6815, timestamp: 1_000 },
      { lat: 7.2985, lng: 125.6815, timestamp: 3_000 },
      { lat: 7.2980, lng: 125.6815, timestamp: 5_000 },
    ].forEach(fix => {
      result = advance({
        evidence,
        distanceAlongKm,
        fix: {
          ...fix,
          accuracy: 5,
          speed: 1.2,
        },
      });
      evidence = result.evidence;
      distanceAlongKm = result.patch.distanceAlongKm ?? distanceAlongKm;
    });

    expect(result.offRoute).toBe(true);
    expect(result.evidence.offRouteSamples).toBeGreaterThanOrEqual(3);
    expect(result.rerouteRecommended).toBe(true);
  });

  test('detects arrival and produces the final maneuver from persisted route geometry', () => {
    const result = advance({
      fix: {
        lat: target.lat,
        lng: target.lng,
        accuracy: 5,
        speed: 0.5,
        timestamp: 10_000,
      },
    });

    expect(result.arrived).toBe(true);
    expect(result.patch.arrived).toBe(true);
    expect(result.patch.remainingKm).toBeLessThanOrEqual(0.08);
    expect(result.patch.nextManeuver).toEqual(expect.objectContaining({ id: 'arrive' }));
  });
});
