import { seedPacks } from '../src/data/local/seed/catalog.jsx';
import {
  buildSmartExploreCatalog,
  sourceReviewFor,
} from '../src/domain/usecases/smartExploreKnowledge.jsx';
import {
  buildSmartTripDraft,
  recommendTourismPlaces,
} from '../src/domain/usecases/smartExplore.jsx';

const catalogFixture = ({ savedIds = [] } = {}) => {
  const items = seedPacks.map(pack => ({
    destination: pack.destination,
    saved: savedIds.includes(pack.id),
  }));
  const packsById = new Map(seedPacks.map(pack => [pack.id, pack]));
  return buildSmartExploreCatalog(items, packsById);
};

describe('Smart Explore local knowledge', () => {
  test('builds spot-level recommendations only from available source-reviewed packs', () => {
    const catalog = catalogFixture();

    expect(catalog).toHaveLength(23);
    expect(catalog.every(place => place.sourceReview.eligible)).toBe(true);
    expect(catalog.every(place => place.offlineNavigationAvailable)).toBe(true);
    expect(catalog.some(place => place.name === 'Panabo Mangrove Park')).toBe(true);
    expect(catalog.some(place => place.name === 'Kaputian Beach Park')).toBe(true);
  });

  test('derives conservative interests from existing curated content instead of invented facts', () => {
    const catalog = catalogFixture();
    const hagimit = catalog.find(place => place.id === 'hagimit-falls:spot-hag-entrance');
    const museum = catalog.find(place => place.id === 'tagum:spot-tag-museum');
    const beach = catalog.find(place => place.id === 'samal:spot-samal-kaputian');

    expect(hagimit.interests).toEqual(expect.arrayContaining(['nature', 'swimming']));
    expect(museum.interests).toEqual(expect.arrayContaining(['culture', 'education', 'history']));
    expect(beach.interests).toEqual(expect.arrayContaining(['beach', 'nature']));
    expect(hagimit).not.toHaveProperty('entranceFee');
    expect(hagimit).not.toHaveProperty('openingHours');
  });

  test('rejects prototype content from recommendation eligibility', () => {
    const review = sourceReviewFor({
      status: 'prototype',
      reviewedAt: '2026-09-28',
      sources: [],
    });

    expect(review).toEqual(expect.objectContaining({
      eligible: false,
      level: 'prototype',
    }));
  });
});

describe('Smart Explore recommendation rules', () => {
  test('applies interest filters and avoids ferry crossings when origin is on the mainland', () => {
    const recommendations = recommendTourismPlaces(
      catalogFixture(),
      {
        interests: ['nature'],
        ferry: 'avoid',
        walking: 'any',
        travelMode: 'drive',
      },
      {
        origin: { lat: 7.4477, lng: 125.8071 },
      },
    );

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.every(place => place.region === 'mainland')).toBe(true);
    expect(recommendations.every(place => place.interests.includes('nature'))).toBe(true);
    expect(recommendations.some(place => place.destinationId === 'panabo')).toBe(true);
    expect(recommendations.some(place => place.destinationId === 'samal')).toBe(false);
  });

  test('can restrict recommendations to packs already saved offline', () => {
    const recommendations = recommendTourismPlaces(
      catalogFixture({ savedIds: ['panabo'] }),
      {
        interests: [],
        ferry: 'allow',
        walking: 'any',
        travelMode: 'drive',
        savedOnly: true,
      },
    );

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.every(place => place.destinationId === 'panabo')).toBe(true);
    expect(recommendations.every(place => place.saved)).toBe(true);
  });

  test('uses offline route estimates when present and explains the route result', () => {
    const catalog = catalogFixture();
    const target = catalog.find(place => place.id === 'tagum:spot-tag-cathedral');
    const recommendations = recommendTourismPlaces(
      catalog,
      { interests: ['culture'], travelMode: 'drive' },
      {
        origin: { lat: 7.44, lng: 125.80 },
        routeEstimates: {
          [target.id]: { distanceKm: 3.5, durationMin: 9 },
        },
      },
    );
    const result = recommendations.find(place => place.id === target.id);

    expect(result.distanceKm).toBe(3.5);
    expect(result.routeEstimate.durationMin).toBe(9);
    expect(result.reasons).toContain('About 9 min by route');
  });

  test('builds an editable smart-trip draft with exact POI targets and no fabricated budget data', () => {
    const recommendations = recommendTourismPlaces(
      catalogFixture(),
      { interests: ['culture'], travelMode: 'drive' },
    );
    const selected = recommendations.slice(0, 2);
    const draft = buildSmartTripDraft({
      recommendations,
      selectedIds: selected.map(place => place.id),
      travelMode: 'drive',
    });

    expect(draft).toEqual(expect.objectContaining({
      kind: 'smart-explore',
      travelMode: 'drive',
    }));
    expect(draft.stops).toHaveLength(2);
    expect(draft.stops[0].target).toEqual(expect.objectContaining({
      lat: expect.any(Number),
      lng: expect.any(Number),
      label: expect.any(String),
    }));
    expect(draft.notes).toContain('Fees, opening hours, and visit duration are not assumed');
    expect(draft).not.toHaveProperty('budget');
  });
});
