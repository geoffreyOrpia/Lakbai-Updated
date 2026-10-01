import React from 'react';
import { act, create } from 'react-test-renderer';
import { DestinationScreen } from '../src/presentation/views/screens/DestinationScreen.jsx';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../src/feedback/FeedbackProvider.jsx', () => ({
  useFeedback: () => ({ showSnackbar: jest.fn(), showConfirm: jest.fn() }),
}));
jest.mock('../src/presentation/views/components/ScreenScrollView.jsx', () => ({
  ScreenScrollView: 'ScreenScrollView',
}));
jest.mock('../src/presentation/views/components/Buttons.jsx', () => ({ BackAction: 'BackAction' }));
jest.mock('../src/presentation/views/components/CoverArt.jsx', () => ({ CoverArt: 'CoverArt' }));
jest.mock('../src/presentation/views/components/DestinationMap.jsx', () => ({ DestinationMap: 'DestinationMap' }));
jest.mock('../src/presentation/views/components/EmptyState.jsx', () => ({ EmptyState: 'EmptyState' }));
jest.mock('../src/presentation/views/components/InfoBanner.jsx', () => ({ InfoBanner: 'InfoBanner' }));
jest.mock('../src/presentation/views/components/LoadingState.jsx', () => ({ LoadingState: 'LoadingState' }));
jest.mock('../src/presentation/views/components/SectionHeader.jsx', () => ({ SectionHeader: 'SectionHeader' }));
jest.mock('../src/presentation/views/components/TrailMiniMap.jsx', () => ({ TrailMiniMap: 'TrailMiniMap' }));
jest.mock('../src/presentation/views/components/Disclosure.jsx', () => ({ Disclosure: 'Disclosure' }));

global.IS_REACT_ACT_ENVIRONMENT = true;

const viewModel = {
  state: {
    loading: false,
    busy: false,
    directionsBusyId: null,
    saved: false,
    savedVersion: null,
    updateAvailable: false,
    offlineBundle: null,
    favorite: false,
    error: null,
    pack: {
      version: 6,
      updatedAt: '2026-09-29T00:00:00.000Z',
      sizeKb: 128,
      spots: [{
        id: 'spot-hag-pool',
        name: 'First Falls Pool',
        category: 'waterfall',
        lat: 7.1164,
        lng: 125.6988,
        description: 'Freshwater pool below one of the falls.',
      }, {
        id: 'spot-hag-junction',
        name: 'Hagimit Road Junction',
        category: 'transport',
        lat: 7.118,
        lng: 125.695,
        description: 'Road junction near the falls.',
      }],
      trails: [],
      routeSuggestions: [],
      withheldTrailsCount: 0,
      transport: {
        gettingThere: [],
        gettingAround: [],
        localTips: [],
      },
      safety: {
        reminders: [],
        emergencyContacts: [],
        facilities: [],
      },
      destination: {
        id: 'hagimit-falls',
        name: 'Hagimit Falls',
        area: 'Peñaplata, Samal',
        category: 'nature',
        status: 'available',
        summary: 'Freshwater cascades and pools in Peñaplata.',
        description: 'Hagimit Falls has freshwater cascades and pools in a natural setting.',
        highlights: [
          'Freshwater cascades and pools',
          'Natural waterfall setting',
        ],
        photos: [],
        coverTheme: {},
        navigation: {
          label: 'Hagimit Falls Nature Park',
          note: 'Live directions use the mapped waterfall entrance in Samal District.',
        },
      },
    },
  },
  back: jest.fn(),
  toggleFavorite: jest.fn(),
  saveToLibrary: jest.fn(),
  removeFromLibrary: jest.fn(),
  prepareAndOpen: jest.fn(),
  openDirections: jest.fn(),
  planRoute: jest.fn(),
};

describe('DestinationScreen highlights', () => {
  let tree;
  afterEach(() => {
    if (tree) act(() => tree.unmount());
  });

  test('puts useful destination information immediately before directions without duplicating it later', () => {
    act(() => {
      tree = create(<DestinationScreen viewModel={viewModel} />);
    });

    const rendered = JSON.stringify(tree.toJSON());
    const discoverIndex = rendered.indexOf('What you’ll find here');
    const descriptionIndex = rendered.indexOf('Hagimit Falls has freshwater cascades and pools in a natural setting.');
    const directionsIndex = rendered.indexOf('DIRECTIONS');

    expect(rendered).toContain('What you’ll find here');
    expect(rendered).toContain('First Falls Pool');
    expect(rendered).toContain('Freshwater pool below one of the falls.');
    const placesIndex = rendered.indexOf('Places to visit');
    const transportNotesIndex = rendered.indexOf('Transport notes', placesIndex);
    const placesSection = rendered.slice(placesIndex, transportNotesIndex > placesIndex ? transportNotesIndex : undefined);
    expect(placesSection).not.toContain('Hagimit Road Junction');
    expect(discoverIndex).toBeGreaterThan(-1);
    expect(descriptionIndex).toBeGreaterThan(discoverIndex);
    expect(directionsIndex).toBeGreaterThan(descriptionIndex);
    expect(rendered).not.toContain('LOCATION & ROUTE');
    expect(rendered).not.toContain('More about this destination');
  });
});
