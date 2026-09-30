const mockRequestForegroundPermissionsAsync = jest.fn();
const mockGetForegroundPermissionsAsync = jest.fn();
const mockGetBackgroundPermissionsAsync = jest.fn();
const mockRequestBackgroundPermissionsAsync = jest.fn();
const mockGetLastKnownPositionAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();
const mockWatchPositionAsync = jest.fn();
const mockHasStartedLocationUpdatesAsync = jest.fn();
const mockStartLocationUpdatesAsync = jest.fn();
const mockStopLocationUpdatesAsync = jest.fn();
const mockHasServicesEnabledAsync = jest.fn();
const mockGetProviderStatusAsync = jest.fn();
const mockNotificationCheck = jest.fn();
const mockNotificationRequest = jest.fn();
let mockAppStateListener = null;
const mockAppState = {
  currentState: 'active',
  addEventListener: jest.fn((event, listener) => {
    mockAppStateListener = listener;
    return { remove: jest.fn() };
  }),
};

jest.mock('react-native', () => ({
  AppState: mockAppState,
  Platform: { OS: 'android', Version: 33 },
  PermissionsAndroid: {
    PERMISSIONS: {
      POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    check: (...args) => mockNotificationCheck(...args),
    request: (...args) => mockNotificationRequest(...args),
  },
}));

jest.mock('expo-location', () => ({
  Accuracy: {
    Balanced: 3,
    High: 4,
    BestForNavigation: 6,
  },
  requestForegroundPermissionsAsync: (...args) => mockRequestForegroundPermissionsAsync(...args),
  getForegroundPermissionsAsync: (...args) => mockGetForegroundPermissionsAsync(...args),
  getBackgroundPermissionsAsync: (...args) => mockGetBackgroundPermissionsAsync(...args),
  requestBackgroundPermissionsAsync: (...args) => mockRequestBackgroundPermissionsAsync(...args),
  getLastKnownPositionAsync: (...args) => mockGetLastKnownPositionAsync(...args),
  getCurrentPositionAsync: (...args) => mockGetCurrentPositionAsync(...args),
  watchPositionAsync: (...args) => mockWatchPositionAsync(...args),
  hasStartedLocationUpdatesAsync: (...args) => mockHasStartedLocationUpdatesAsync(...args),
  startLocationUpdatesAsync: (...args) => mockStartLocationUpdatesAsync(...args),
  stopLocationUpdatesAsync: (...args) => mockStopLocationUpdatesAsync(...args),
  hasServicesEnabledAsync: (...args) => mockHasServicesEnabledAsync(...args),
  getProviderStatusAsync: (...args) => mockGetProviderStatusAsync(...args),
}));

import { ExpoLocationService } from '../src/data/services/locationService.jsx';

const location = ({ accuracy = 12, timestamp = Date.now(), lat = 7.44, lng = 125.8 } = {}) => ({
  coords: {
    latitude: lat,
    longitude: lng,
    accuracy,
    heading: null,
    speed: null,
  },
  timestamp,
});

describe('ExpoLocationService resilient fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    mockGetForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    mockGetBackgroundPermissionsAsync.mockResolvedValue({ granted: false });
    mockRequestBackgroundPermissionsAsync.mockResolvedValue({ granted: true });
    mockGetLastKnownPositionAsync.mockResolvedValue(null);
    mockGetCurrentPositionAsync.mockResolvedValue(location());
    mockWatchPositionAsync.mockResolvedValue({ remove: jest.fn() });
    mockHasStartedLocationUpdatesAsync.mockResolvedValue(false);
    mockStartLocationUpdatesAsync.mockResolvedValue(undefined);
    mockStopLocationUpdatesAsync.mockResolvedValue(undefined);
    mockHasServicesEnabledAsync.mockResolvedValue(true);
    mockGetProviderStatusAsync.mockResolvedValue({
      locationServicesEnabled: true,
      gpsAvailable: true,
      networkAvailable: true,
    });
    mockNotificationCheck.mockResolvedValue(false);
    mockNotificationRequest.mockResolvedValue('granted');
    mockAppState.currentState = 'active';
    mockAppStateListener = null;
  });

  test('returns a recent accurate cached fix immediately indoors', async () => {
    mockGetLastKnownPositionAsync.mockResolvedValue(location({ accuracy: 35 }));

    const fix = await new ExpoLocationService().getCurrentFix();

    expect(fix).toEqual(expect.objectContaining({
      lat: 7.44,
      lng: 125.8,
      accuracy: 35,
      source: 'last-known',
    }));
    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
    expect(mockGetLastKnownPositionAsync).toHaveBeenCalledWith({
      maxAge: 300000,
      requiredAccuracy: 250,
    });
  });

  test('falls back to a recent approximate cached fix when fresh GPS fails', async () => {
    mockGetLastKnownPositionAsync.mockResolvedValue(location({ accuracy: 180 }));
    mockGetCurrentPositionAsync.mockRejectedValue(new Error('GPS unavailable indoors'));

    const fix = await new ExpoLocationService().getCurrentFix();

    expect(fix).toEqual(expect.objectContaining({
      accuracy: 180,
      source: 'last-known',
    }));
  });

  test('prefers a fresh fix when the cached estimate is only approximate', async () => {
    mockGetLastKnownPositionAsync.mockResolvedValue(location({ accuracy: 180, lat: 7.4 }));
    mockGetCurrentPositionAsync.mockResolvedValue(location({ accuracy: 18, lat: 7.5 }));

    const fix = await new ExpoLocationService().getCurrentFix();

    expect(fix).toEqual(expect.objectContaining({
      lat: 7.5,
      accuracy: 18,
      source: 'current',
    }));
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 3 });
  });

  test('does not reuse a cached estimate that is too old or too inaccurate', async () => {
    mockGetLastKnownPositionAsync.mockResolvedValue(location({
      accuracy: 300,
      timestamp: Date.now() - 10 * 60 * 1000,
    }));
    mockGetCurrentPositionAsync.mockRejectedValue(new Error('GPS unavailable'));

    await expect(new ExpoLocationService().getCurrentFix()).resolves.toBeNull();
  });

  test('uses a stricter freshness profile for route starts', async () => {
    mockGetLastKnownPositionAsync.mockResolvedValue(location({
      accuracy: 180,
      timestamp: Date.now() - 20_000,
    }));
    mockGetCurrentPositionAsync.mockResolvedValue(location({ accuracy: 20 }));

    const fix = await new ExpoLocationService().getCurrentFix({ purpose: 'route' });

    expect(fix).toEqual(expect.objectContaining({
      accuracy: 20,
      source: 'current',
    }));
    expect(mockGetLastKnownPositionAsync).toHaveBeenCalledWith({
      maxAge: 30_000,
      requiredAccuracy: 250,
    });
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 4 });
  });

  test('refreshes an accurate discovery fix when it is no longer fresh enough for proximity', async () => {
    const staleAccurate = location({
      accuracy: 20,
      timestamp: Date.now() - 60_000,
      lat: 7.4,
    });
    mockGetLastKnownPositionAsync.mockResolvedValue(staleAccurate);
    mockGetCurrentPositionAsync.mockResolvedValue(location({
      accuracy: 18,
      lat: 7.5,
    }));

    const fix = await new ExpoLocationService().getCurrentFix({ purpose: 'discovery' });

    expect(fix).toEqual(expect.objectContaining({
      lat: 7.5,
      source: 'current',
    }));
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });

  test('hydrates one recent app-owned fix across runtime recreation', async () => {
    const now = 50_000;
    const snapshotStore = {
      get: jest.fn().mockResolvedValue({
        lat: 7.44,
        lng: 125.8,
        accuracy: 25,
        heading: null,
        speed: null,
        timestamp: now - 5_000,
      }),
      save: jest.fn(),
      clear: jest.fn(),
    };
    const service = new ExpoLocationService({ snapshotStore, now: () => now });

    const fix = await service.getCurrentFix({ purpose: 'route' });

    expect(fix).toEqual(expect.objectContaining({
      lat: 7.44,
      accuracy: 25,
      source: 'persisted',
    }));
    expect(mockGetLastKnownPositionAsync).not.toHaveBeenCalled();
    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  test('shares one native foreground watcher across multiple consumers', async () => {
    const nativeRemove = jest.fn();
    mockWatchPositionAsync.mockResolvedValue({ remove: nativeRemove });
    const first = jest.fn();
    const second = jest.fn();
    const service = new ExpoLocationService();

    const stopFirst = await service.watchFix(first, jest.fn(), { purpose: 'navigation' });
    const stopSecond = await service.watchFix(second, jest.fn(), { purpose: 'trail' });
    const emit = mockWatchPositionAsync.mock.calls[0][1];

    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);
    emit(location({ timestamp: 10_000, accuracy: 8 }));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    stopFirst();
    expect(nativeRemove).not.toHaveBeenCalled();
    stopSecond();
    expect(nativeRemove).toHaveBeenCalledTimes(1);
  });

  test('stops the native foreground watcher in background and restores it on foreground', async () => {
    const firstRemove = jest.fn();
    const secondRemove = jest.fn();
    mockWatchPositionAsync
      .mockResolvedValueOnce({ remove: firstRemove })
      .mockResolvedValueOnce({ remove: secondRemove });
    const service = new ExpoLocationService();
    const stop = await service.watchFix(jest.fn(), jest.fn(), { purpose: 'navigation' });

    mockAppState.currentState = 'background';
    service.handleAppStateChange('background');
    expect(firstRemove).toHaveBeenCalledTimes(1);

    mockAppState.currentState = 'active';
    service.handleAppStateChange('active');
    for (let attempt = 0; attempt < 10 && mockWatchPositionAsync.mock.calls.length < 2; attempt += 1) {
      await Promise.resolve();
    }

    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(2);
    if (service.watchStartPromise) await service.watchStartPromise;
    stop();
    expect(secondRemove).toHaveBeenCalledTimes(1);
  });

  test('reports when device location services are disabled', async () => {
    mockHasServicesEnabledAsync.mockResolvedValue(false);
    mockGetProviderStatusAsync.mockResolvedValue({
      locationServicesEnabled: false,
      gpsAvailable: false,
      networkAvailable: false,
    });

    await expect(
      new ExpoLocationService().locationFailureMessage('GPS unavailable'),
    ).resolves.toContain('turned off');
  });

  test('requests Android background permission only after foreground location is available', async () => {
    await expect(
      new ExpoLocationService().requestBackgroundNavigationPermissions(),
    ).resolves.toBe(true);

    expect(mockGetForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockRequestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(mockGetBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockRequestBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  test('starts a foreground-service location task for active navigation', async () => {
    const service = new ExpoLocationService();

    await expect(service.startBackgroundNavigation({
      destinationName: 'Hagimit Falls',
    })).resolves.toBe(true);

    expect(mockStartLocationUpdatesAsync).toHaveBeenCalledWith(
      'lakbai-background-navigation',
      expect.objectContaining({
        accuracy: 6,
        distanceInterval: 3,
        timeInterval: 2000,
        foregroundService: expect.objectContaining({
          notificationTitle: 'LakBai navigation active',
          notificationBody: expect.stringContaining('Hagimit Falls'),
          killServiceOnDestroy: false,
        }),
      }),
    );
  });

  test('requests Android 13 notification permission so the navigation service stays visible', async () => {
    await expect(
      new ExpoLocationService().requestNavigationNotificationPermission(),
    ).resolves.toBe(true);

    expect(mockNotificationCheck).toHaveBeenCalledWith(
      'android.permission.POST_NOTIFICATIONS',
    );
    expect(mockNotificationRequest).toHaveBeenCalledWith(
      'android.permission.POST_NOTIFICATIONS',
      expect.objectContaining({
        title: 'Keep LakBai navigation visible',
      }),
    );
  });

  test('stops the background task only when it is registered', async () => {
    mockHasStartedLocationUpdatesAsync.mockResolvedValue(true);

    await new ExpoLocationService().stopBackgroundNavigation();

    expect(mockStopLocationUpdatesAsync).toHaveBeenCalledWith(
      'lakbai-background-navigation',
    );
  });
});
