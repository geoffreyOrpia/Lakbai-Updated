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
      spots: [],
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
        summary: 'A Samal waterfall attraction with offline orientation and source-aware planning notes.',
        description: 'Detailed destination context for Hagimit Falls.',
        highlights: [
          'Waterfall destination in the Samal tourism area',
          'Offline entrance and orientation references',
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

  test('puts a concise destination summary and highlights before routing controls', () => {
    act(() => {
      tree = create(<DestinationScreen viewModel={viewModel} />);
    });

    const rendered = JSON.stringify(tree.toJSON());
    const summaryIndex = rendered.indexOf('A Samal waterfall attraction');
    const routeIndex = rendered.indexOf('LOCATION & ROUTE');

    expect(rendered).toContain('What you’ll find');
    expect(rendered).toContain('Waterfall destination in the Samal tourism area');
    expect(rendered).toContain('Offline entrance and orientation references');
    expect(summaryIndex).toBeGreaterThan(-1);
    expect(routeIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeLessThan(routeIndex);
    expect(rendered).toContain('More about this destination');
  });
});
