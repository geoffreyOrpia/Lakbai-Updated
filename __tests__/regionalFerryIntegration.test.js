import fs from 'node:fs';
import path from 'node:path';
import { calculateOfflineFerryJourney } from '../src/domain/usecases/ferryJourney.jsx';

const loadRegion = region => JSON.parse(fs.readFileSync(
  path.join(process.cwd(), 'src/data/assets/routing', `${region}.routing`),
  'utf8',
));

const mainland = loadRegion('mainland');
const samal = loadRegion('samal');
const repository = {
  getForRegion: async region => (
    region === 'mainland' ? mainland : region === 'samal' ? samal : null
  ),
};

const panabo = { lat: 7.2999, lng: 125.6801 };
const penaplata = { lat: 7.1072, lng: 125.6903 };

describe('shipped regional ferry integration', () => {
  test.each(['walk', 'drive'])('connects Panabo to Samal through explicit ferry legs for %s', async mode => {
    const result = await calculateOfflineFerryJourney({
      routingGraphRepository: repository,
      from: panabo,
      to: penaplata,
      mode,
      targetLabel: 'Peñaplata',
    });

    expect(result.ok).toBe(true);
    expect(result.legs.map(leg => leg.kind)).toEqual(['road', 'ferry', 'road']);
    expect(result.legs[0].region).toBe('mainland');
    expect(result.legs[2].region).toBe('samal');
    expect(result.ferryLeg.distanceKm).toBeGreaterThan(2);
    expect(result.ferryLeg.distanceKm).toBeLessThan(3.5);
    expect(result.ferryDurationMin).toBe(30);
    expect(result.queueDurationMin).toBeNull();
  });

  test.each(['walk', 'drive'])('connects Samal back to the mainland through the reverse ferry leg for %s', async mode => {
    const result = await calculateOfflineFerryJourney({
      routingGraphRepository: repository,
      from: penaplata,
      to: panabo,
      mode,
      targetLabel: 'Panabo',
    });

    expect(result.ok).toBe(true);
    expect(result.originRegion).toBe('samal');
    expect(result.targetRegion).toBe('mainland');
    expect(result.ferryLeg.geometry.coordinates[0]).toEqual([
      result.ferryLeg.originTerminal.lng,
      result.ferryLeg.originTerminal.lat,
    ]);
    expect(result.ferryLeg.geometry.coordinates.at(-1)).toEqual([
      result.ferryLeg.targetTerminal.lng,
      result.ferryLeg.targetTerminal.lat,
    ]);
  });
});
