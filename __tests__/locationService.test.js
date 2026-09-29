const mockRequestForegroundPermissionsAsync = jest.fn();
const mockGetLastKnownPositionAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();
const mockWatchPositionAsync = jest.fn();

jest.mock('expo-location', () => ({
  Accuracy: {
    Balanced: 3,
    High: 4,
    BestForNavigation: 6,
  },
  requestForegroundPermissionsAsync: (...args) => mockRequestForegroundPermissionsAsync(...args),
  getLastKnownPositionAsync: (...args) => mockGetLastKnownPositionAsync(...args),
  getCurrentPositionAsync: (...args) => mockGetCurrentPositionAsync(...args),
  watchPositionAsync: (...args) => mockWatchPositionAsync(...args),
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
    mockGetLastKnownPositionAsync.mockResolvedValue(null);
    mockGetCurrentPositionAsync.mockResolvedValue(location());
    mockWatchPositionAsync.mockResolvedValue({ remove: jest.fn() });
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
});
