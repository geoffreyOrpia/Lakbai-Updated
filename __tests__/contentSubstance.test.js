import { destinations } from '../src/data/local/seed/destinations.jsx';
import { seedPacks } from '../src/data/local/seed/catalog.jsx';
import { buildSmartTripDraft, recommendTourismPlaces } from '../src/domain/usecases/smartExplore.jsx';
import { buildSmartExploreCatalog } from '../src/domain/usecases/smartExploreKnowledge.jsx';

const IMPLEMENTATION_COPY = /source-reviewed|source-aware|planning-only|offline orientation|destination pack|pack content|prototype/i;

describe('user-facing content substance', () => {
  test('available destination summaries describe the place rather than LakBai internals', () => {
    for (const destination of destinations.filter(item => item.status === 'available')) {
      const copy = [
        destination.summary,
        destination.description,
        ...(destination.highlights ?? []),
      ].join(' ');

      expect(copy).not.toMatch(IMPLEMENTATION_COPY);
      expect(copy).not.toMatch(/LakBai/i);
      expect(destination.summary.length).toBeGreaterThan(20);
      expect(destination.description.length).toBeGreaterThan(60);
    }
  });

  test('assisted trip drafts carry traveler information instead of scoring/provenance text', () => {
    const items = seedPacks.map(pack => ({
      destination: pack.destination,
      saved: false,
      updateAvailable: false,
    }));
    const packsById = new Map(seedPacks.map(pack => [pack.id, pack]));
    const catalog = buildSmartExploreCatalog(items, packsById);
    const recommendations = recommendTourismPlaces(catalog, {
      interests: ['nature'],
      walking: 'any',
      travelMode: 'walk',
      ferry: 'allow',
      savedOnly: false,
    });
    const selectedIds = recommendations.slice(0, 2).map(place => place.id);
    const draft = buildSmartTripDraft({
      recommendations,
      selectedIds,
      travelMode: 'walk',
    });

    expect(draft).toBeTruthy();
    expect(draft.notes).not.toMatch(/source-reviewed|destination pack|Smart Explore|generated offline/i);
    for (const stop of draft.stops) {
      expect(stop.note).not.toMatch(/source-reviewed|offline pack|route target available/i);
    }
  });
});
