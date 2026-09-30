import React from 'react';
import { act, create } from 'react-test-renderer';
import { BackHandler } from 'react-native';

const mockClearPreferences = jest.fn().mockResolvedValue(undefined);
const mockSavePreferences = jest.fn().mockResolvedValue(undefined);
const mockGetPreferences = jest.fn().mockResolvedValue({
  interests: ['Beaches'],
  pace: 'balanced',
  offlineFirst: true,
});
const mockGetActiveSession = jest.fn().mockResolvedValue({
  version: 1,
  savedAt: Date.now(),
  completedStopCount: 0,
  route: {
    destinationId: 'samal',
    destinationName: 'Samal Island',
    target: { lat: 7.13, lng: 125.68 },
    multiStops: [{ name: 'Stop one', target: { lat: 7.13, lng: 125.68 } }],
    tripId: 'saved-trip',
  },
});

jest.mock('../src/presentation/di/container.jsx', () => ({ getContainer: () => ({
  preferencesDeps: {
    preferencesRepository: {
      clear: mockClearPreferences,
      save: mockSavePreferences,
      get: mockGetPreferences,
    },
  },
  destinationDeps: {
    packRepository: {},
  },
  safetyDeps: {
    safetyRepository: {},
    phoneService: { call: jest.fn().mockResolvedValue(undefined) },
  },
  routingDeps: { navigationSessionRepository: { getActiveSession: mockGetActiveSession } },
}) }));

// Exercise the real navigator and model state, without storage or native screens.
jest.mock('../src/presentation/viewmodel/useViewModel.jsx', () => ({ useViewModel: factory => {
  const React = require('react');
  const [vm] = React.useState(() => {
    const model = factory();
    model.load = jest.fn().mockResolvedValue(undefined);
    if (model.refreshSavedPlaces) model.refreshSavedPlaces = jest.fn().mockResolvedValue(undefined);
    if (model.constructor.name === 'SessionViewModel') model.setState({ phase: 'main' });
    return model;
  });
  React.useSyncExternalStore(vm.subscribe, vm.getState);
  return vm;
} }));

for (const name of ['Destination', 'Nearby', 'Navigation', 'Explore', 'Home', 'Library', 'Safety', 'Settings', 'Trail', 'Trips', 'Onboarding', 'Landing']) {
  jest.doMock(`../src/presentation/views/screens/${name}Screen.jsx`, () => ({ [`${name}Screen`]: `${name}Screen` }));
}
jest.mock('../src/presentation/views/components/BottomNav.jsx', () => ({ BottomNav: 'BottomNav' }));

const { AppNavigator } = require('../src/presentation/navigation/AppNavigator.jsx');
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('navigation continuity', () => {
  let tree;
  let backListeners;
  const switchTab = tab => act(() => tree.root.findByType('BottomNav').props.onChange(tab));
  const pressBack = () => act(() => [...backListeners].reverse().some(listener => listener()));
  beforeEach(async () => {
    backListeners = new Set();
    mockGetActiveSession.mockClear();
    mockClearPreferences.mockClear();
    mockSavePreferences.mockClear();
    mockGetPreferences.mockClear();
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, listener) => {
      backListeners.add(listener);
      return { remove: () => backListeners.delete(listener) };
    });
    await act(async () => { tree = create(<AppNavigator />); });
  });
  afterEach(() => { act(() => tree.unmount()); jest.restoreAllMocks(); });

  test('a fresh app launch opens Home instead of auto-resuming saved navigation', () => {
    expect(tree.root.findByType('BottomNav').props.active).toBe('home');
    expect(tree.root.findAllByType('NavigationScreen')).toHaveLength(0);
    expect(tree.root.findAllByType('HomeScreen')).toHaveLength(1);
    expect(mockGetActiveSession).toHaveBeenCalledTimes(1);
  });

  test('reopens a valid active background-navigation session on the live route', async () => {
    act(() => tree.unmount());
    mockGetActiveSession.mockResolvedValueOnce({
      version: 2,
      sessionId: 'nav-live-1',
      status: 'active',
      startedAt: Date.now() - 60_000,
      savedAt: Date.now(),
      request: {
        destinationId: 'samal',
        destinationName: 'Samal Island',
        target: { label: 'Hagimit Falls', lat: 7.11, lng: 125.72 },
        multiStops: [],
        mode: 'drive',
        preference: 'direct',
      },
      navigationRoute: {
        ok: true,
        distanceKm: 4,
        durationMin: 10,
        maneuvers: [],
      },
      progress: {
        distanceAlongKm: 1,
        completedStopCount: 0,
        remainingKm: 3,
        remainingMin: 8,
      },
      evidence: {},
      voiceGuidance: true,
      backgroundEnabled: true,
    });

    await act(async () => {
      tree = create(<AppNavigator />);
      await Promise.resolve();
    });

    expect(tree.root.findAllByType('NavigationScreen')).toHaveLength(1);
    expect(tree.root.findByType('NavigationScreen').props.viewModel.state).toMatchObject({
      destinationId: 'samal',
      tracking: true,
      backgroundNavigation: true,
      remainingKm: 3,
    });
  });

  test('device Back returns from the trip editor before leaving Trips', () => {
    switchTab('trips');
    const trips = tree.root.findByType('TripsScreen').props.viewModel;
    act(() => trips.openCreate());
    pressBack();
    expect(trips.state.mode).toBe('list');
    expect(tree.root.findByType('BottomNav').props.active).toBe('trips');
    pressBack();
    expect(tree.root.findByType('BottomNav').props.active).toBe('home');
  });

  test('resetting setup from Safety clears navigation state and finishes back on Home', async () => {
    switchTab('safety');
    act(() => tree.root.findByType('SafetyScreen').props.onOpenSettings());
    const settings = tree.root.findByType('SettingsScreen').props.viewModel;

    await act(async () => {
      const result = await settings.restartSetup();
      expect(result.ok).toBe(true);
    });

    expect(mockClearPreferences).toHaveBeenCalledTimes(1);
    expect(tree.root.findAllByType('LandingScreen')).toHaveLength(1);

    act(() => tree.root.findByType('LandingScreen').props.onContinue());
    const onboarding = tree.root.findByType('OnboardingScreen').props.viewModel;
    act(() => {
      onboarding.toggleInterest('Beaches');
      onboarding.next();
    });
    await act(async () => {
      expect(await onboarding.complete()).toBe(true);
    });

    expect(mockSavePreferences).toHaveBeenCalledTimes(1);
    expect(tree.root.findByType('BottomNav').props.active).toBe('home');
    expect(tree.root.findAllByType('HomeScreen')).toHaveLength(1);
    expect(tree.root.findAllByType('SafetyScreen')).toHaveLength(0);
    expect(tree.root.findAllByType('SettingsScreen')).toHaveLength(0);
  });

  test('keeps Nearby and its search mounted through destination and trail visits, then releases popped pages', () => {
    act(() => tree.root.findByType('HomeScreen').props.viewModel.openNearby());
    const nearbyScreen = tree.root.findByType('NearbyScreen');
    const nearby = nearbyScreen.props.viewModel;
    act(() => nearby.setQuery('Babak'));
    act(() => nearby.openDestination('samal'));
    const guideScreen = tree.root.findByType('DestinationScreen');
    const guide = guideScreen.props.viewModel;
    act(() => guide.openTrail('walk'));
    expect(tree.root.findByType('DestinationScreen')).toBe(guideScreen);
    expect(tree.root.findByType('NearbyScreen')).toBe(nearbyScreen);
    pressBack();
    expect(tree.root.findByType('DestinationScreen').props.viewModel).toBe(guide);
    expect(tree.root.findAllByType('TrailScreen')).toHaveLength(0);
    act(() => guide.back());
    expect(tree.root.findByType('NearbyScreen').props.viewModel).toBe(nearby);
    expect(nearby.state.query).toBe('Babak');
    expect(nearby.refreshSavedPlaces).toHaveBeenCalledTimes(1);
    act(() => nearby.back());
    expect(tree.root.findAllByType('NearbyScreen')).toHaveLength(0);
    act(() => tree.root.findByType('HomeScreen').props.viewModel.openNearby());
    expect(tree.root.findByType('NearbyScreen').props.viewModel).not.toBe(nearby);
  });

  test('retains the route but stops tracking when a trail covers navigation', () => {
    switchTab('explore');
    act(() => tree.root.findByType('ExploreScreen').props.onOpenDestination('panabo'));
    const guide = tree.root.findByType('DestinationScreen').props.viewModel;
    act(() => guide.nav.onOpenNavigation({ destinationId: 'panabo', trailId: 'boardwalk', target: { lat: 7.3, lng: 125.6 } }));
    const navigation = tree.root.findByType('NavigationScreen').props.viewModel;
    const stop = jest.fn();
    const route = { distanceKm: 2 };
    act(() => { navigation.unwatch = stop; navigation.setState({ tracking: true, route }); });
    act(() => navigation.openTrail());
    expect(navigation.state.tracking).toBe(false);
    expect(stop).toHaveBeenCalledTimes(1);
    pressBack();
    expect(tree.root.findByType('NavigationScreen').props.viewModel).toBe(navigation);
    expect(navigation.state.route).toBe(route);
  });

  test('preserves search and filters through a guide visit and tab changes, refreshing on return', () => {
    switchTab('explore');
    const explore = tree.root.findByType('ExploreScreen').props.viewModel;
    act(() => { explore.setQuery('Samal'); explore.setCategory('island'); });
    act(() => tree.root.findByType('ExploreScreen').props.onOpenDestination('samal'));
    expect(tree.root.findByType('ExploreScreen').props.viewModel).toBe(explore);
    act(() => tree.root.findByType('DestinationScreen').props.viewModel.back());
    switchTab('library');
    switchTab('explore');
    expect(tree.root.findByType('ExploreScreen').props.viewModel).toBe(explore);
    expect(explore.state).toMatchObject({ query: 'Samal', category: 'island' });
    expect(explore.load).toHaveBeenCalledTimes(2);
  });

  test('preserves an unfinished trip across tabs and accepts a new suggested route on an existing Trips tab', () => {
    switchTab('trips');
    const trips = tree.root.findByType('TripsScreen').props.viewModel;
    act(() => { trips.openCreate(); trips.setFormField({ title: 'Weekend', notes: 'Bring water' }); });
    switchTab('home');
    switchTab('trips');
    expect(tree.root.findByType('TripsScreen').props.viewModel).toBe(trips);
    expect(trips.state.form).toMatchObject({ title: 'Weekend', notes: 'Bring water' });
    switchTab('explore');
    act(() => tree.root.findByType('ExploreScreen').props.onOpenDestination('samal'));
    const destination = tree.root.findByType('DestinationScreen').props.viewModel;
    act(() => destination.nav.onPlanRoute({ destinationId: 'samal', destinationName: 'Samal', routeName: 'Island day', stops: [{ name: 'Beach' }] }));
    expect(tree.root.findByType('TripsScreen').props.viewModel).toBe(trips);
    expect(trips.state.form.title).toBe('Samal: Island day');
    expect(trips.state.mode).toBe('create');
  });
});
