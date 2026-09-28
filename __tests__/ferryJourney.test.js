import {
  calculateOfflineFerryJourney,
  isOnFerryLeg,
  remainingFerryJourneyDurationMin,
} from '../src/domain/usecases/ferryJourney.jsx';

const roadGraph = (id, start, end, distanceKm) => ({
  meta: { id },
  nodes: [
    { id: 'a', ...start },
    { id: 'b', ...end },
  ],
  edges: [
    {
      from: 'a',
      to: 'b',
      distanceKm,
      walk: true,
      drive: true,
      highway: 'primary',
      name: id,
    },
    {
      from: 'b',
      to: 'a',
      distanceKm,
      walk: true,
      drive: true,
      highway: 'primary',
      name: id,
    },
  ],
});

const mainlandStart = { lat: 7.2999, lng: 125.6801 };
const mainlandTerminal = { lat: 7.1461111111, lng: 125.6633333333 };
const samalTerminal = { lat: 7.1336111111, lng: 125.6838888889 };
const samalTarget = { lat: 7.1072, lng: 125.6903 };
const mainlandGraph = roadGraph('Mainland approach', mainlandStart, mainlandTerminal, 17.2);
const samalGraph = roadGraph('Samal arrival road', samalTerminal, samalTarget, 3.1);

const repository = {
  getForRegion: jest.fn(async region => (
    region === 'mainland' ? mainlandGraph : region === 'samal' ? samalGraph : null
  )),
};

describe('offline ferry journeys', () => {
  beforeEach(() => repository.getForRegion.mockClear());

  test.each(['walk', 'drive'])('builds explicit road-ferry-road journeys for %s', async mode => {
    const result = await calculateOfflineFerryJourney({
      routingGraphRepository: repository,
      from: mainlandStart,
      to: samalTarget,
      mode,
      targetLabel: 'Peñaplata',
    });

    expect(result.ok).toBe(true);
    expect(result.type).toBe('ferry-journey');
    expect(result.originRegion).toBe('mainland');
    expect(result.targetRegion).toBe('samal');
    expect(result.legs.map(leg => leg.kind)).toEqual(['road', 'ferry', 'road']);
    expect(result.ferryLeg.originTerminal.id).toBe('davsam-panacan');
    expect(result.ferryLeg.targetTerminal.id).toBe('port-of-babak');
    expect(result.totalDurationKnown).toBe(false);
    expect(result.ferryDurationMin).toBe(30);
    expect(result.queueDurationMin).toBeNull();
    expect(result.roadDurationMin).toBeGreaterThan(0);
    expect(result.durationMin).toBe(result.roadDurationMin + 30);
    expect(result.maneuvers).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'ferry-board' }),
      expect.objectContaining({ kind: 'ferry-arrive' }),
    ]));
    expect(isOnFerryLeg(
      result,
      (result.ferryLeg.startKm + result.ferryLeg.endKm) / 2,
    )).toBe(true);
    expect(remainingFerryJourneyDurationMin(result, 0)).toBe(Math.ceil(result.durationMin));
    expect(remainingFerryJourneyDurationMin(result, result.ferryLeg.endKm))
      .toBe(Math.ceil(result.legs[2].route.durationMin));
  });

  test('supports the reverse Samal-to-mainland journey', async () => {
    const result = await calculateOfflineFerryJourney({
      routingGraphRepository: repository,
      from: samalTarget,
      to: mainlandStart,
      mode: 'drive',
      targetLabel: 'Panabo',
    });

    expect(result.ok).toBe(true);
    expect(result.originRegion).toBe('samal');
    expect(result.targetRegion).toBe('mainland');
    expect(result.ferryLeg.originTerminal.id).toBe('port-of-babak');
    expect(result.ferryLeg.targetTerminal.id).toBe('davsam-panacan');
    expect(result.ferryLeg.geometry.coordinates[0]).toEqual([
      result.ferryLeg.originTerminal.lng,
      result.ferryLeg.originTerminal.lat,
    ]);
    expect(result.ferryLeg.geometry.coordinates.at(-1)).toEqual([
      result.ferryLeg.targetTerminal.lng,
      result.ferryLeg.targetTerminal.lat,
    ]);
  });

  test('does not insert a ferry into same-region journeys', async () => {
    const result = await calculateOfflineFerryJourney({
      routingGraphRepository: repository,
      from: { lat: 7.2999, lng: 125.6801 },
      to: { lat: 7.4477, lng: 125.8071 },
      mode: 'drive',
    });

    expect(result).toEqual({ ok: false, reason: 'ferry-not-required' });
    expect(repository.getForRegion).not.toHaveBeenCalled();
  });

  test('fails closed when one regional road graph is unavailable', async () => {
    const unavailable = {
      getForRegion: jest.fn(async region => (
        region === 'mainland' ? mainlandGraph : null
      )),
    };
    const result = await calculateOfflineFerryJourney({
      routingGraphRepository: unavailable,
      from: mainlandStart,
      to: samalTarget,
      mode: 'walk',
    });

    expect(result).toEqual({ ok: false, reason: 'target-routing-unavailable' });
  });
});
