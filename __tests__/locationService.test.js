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
const mockNotificationCheck = jest.fn();
const mockNotificationRequest = jest.fn();

jest.mock('react-native', () => ({
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
    mockNotificationCheck.mockResolvedValue(false);
    mockNotificationRequest.mockResolvedValue('granted');
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
