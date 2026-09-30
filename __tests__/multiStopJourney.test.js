import {
  calculateOfflineMultiStopJourney,
  completedMultiStopCount,
  remainingMultiStopDurationMin,
} from '../src/domain/usecases/multiStopJourney.jsx';
import { isOnFerryLeg } from '../src/domain/usecases/ferryJourney.jsx';

const mainlandStart = { lat: 7.2999, lng: 125.6801 };
const mainlandStop = { lat: 7.28, lng: 125.6805 };
const mainlandTerminal = { lat: 7.1461111111, lng: 125.6633333333 };
const samalTerminal = { lat: 7.1336111111, lng: 125.6838888889 };
const samalTarget = { lat: 7.1072, lng: 125.6903 };

const mainlandGraph = {
  meta: { id: 'multi-mainland' },
  nodes: [
    { id: 'a', ...mainlandStart },
    { id: 'b', ...mainlandStop },
    { id: 't', ...mainlandTerminal },
  ],
  edges: [
    { from: 'a', to: 'b', distanceKm: 2.2, walk: true, drive: true, highway: 'primary' },
    { from: 'b', to: 'a', distanceKm: 2.2, walk: true, drive: true, highway: 'primary' },
    { from: 'b', to: 't', distanceKm: 15, walk: true, drive: true, highway: 'primary' },
    { from: 't', to: 'b', distanceKm: 15, walk: true, drive: true, highway: 'primary' },
  ],
};
const samalGraph = {
  meta: { id: 'multi-samal' },
  nodes: [
    { id: 't', ...samalTerminal },
    { id: 's', ...samalTarget },
  ],
  edges: [
    { from: 't', to: 's', distanceKm: 3.1, walk: true, drive: true, highway: 'primary' },
    { from: 's', to: 't', distanceKm: 3.1, walk: true, drive: true, highway: 'primary' },
  ],
};
const repository = {
  getForRegion: jest.fn(async region => (
    region === 'mainland' ? mainlandGraph : region === 'samal' ? samalGraph : null
  )),
};

describe('offline multi-stop journeys', () => {
  test('keeps ordered stops and composes a ferry only when the itinerary crosses regions', async () => {
    const result = await calculateOfflineMultiStopJourney({
      routingGraphRepository: repository,
      from: mainlandStart,
      stops: [{
        destinationId: 'panabo',
        name: 'Mainland stop',
        target: mainlandStop,
      }, {
        destinationId: 'samal',
        name: 'Samal stop',
        target: samalTarget,
      }],
      mode: 'walk',
    });

    expect(result.ok).toBe(true);
    expect(result.type).toBe('multi-stop-journey');
    expect(result.journeyLegs.map(leg => leg.kind)).toEqual(['road-journey', 'ferry-journey']);
    expect(result.stopOffsets.map(marker => marker.stopIndex)).toEqual([0, 1]);
    expect(result.ferryLegs).toHaveLength(1);
    expect(new Set(result.roadLegs.map(leg => leg.stopIndex))).toEqual(new Set([0, 1]));
    expect(result.ferryLegs[0].stopIndex).toBe(1);
    expect(result.maneuvers).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'stop-arrive', stopIndex: 0 }),
      expect.objectContaining({ kind: 'ferry-board' }),
      expect.objectContaining({ kind: 'arrive', stopIndex: 1 }),
    ]));
    expect(result.totalDurationKnown).toBe(false);
  });

  test('tracks completed stops and remaining journey time on one progress line', async () => {
    const result = await calculateOfflineMultiStopJourney({
      routingGraphRepository: repository,
      from: mainlandStart,
      stops: [{
        destinationId: 'panabo',
        name: 'Mainland stop',
        target: mainlandStop,
      }, {
        destinationId: 'samal',
        name: 'Samal stop',
        target: samalTarget,
      }],
      mode: 'walk',
    });
    const firstStopKm = result.stopOffsets[0].distanceAlongKm;
    const ferryMidKm = (result.ferryLegs[0].startKm + result.ferryLegs[0].endKm) / 2;

    expect(completedMultiStopCount(result, firstStopKm + 0.01)).toBe(1);
    expect(completedMultiStopCount(result, result.distanceKm)).toBe(2);
    expect(remainingMultiStopDurationMin(result, firstStopKm))
      .toBeLessThan(remainingMultiStopDurationMin(result, 0));
    expect(isOnFerryLeg(result, ferryMidKm)).toBe(true);
  });

  test('fails closed and identifies the stop whose leg cannot be built', async () => {
    const unavailable = {
      getForRegion: jest.fn().mockResolvedValue(null),
    };
    const result = await calculateOfflineMultiStopJourney({
      routingGraphRepository: unavailable,
      from: mainlandStart,
      stops: [{
        destinationId: 'panabo',
        name: 'Unavailable stop',
        target: mainlandStop,
      }],
      mode: 'walk',
    });

    expect(result).toEqual({
      ok: false,
      reason: 'multi-stop-routing-unavailable',
      stopIndex: 0,
    });
  });
});
