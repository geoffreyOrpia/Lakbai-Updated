const mockHasStartedLocationUpdatesAsync = jest.fn();
const mockStopLocationUpdatesAsync = jest.fn();

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('expo-location', () => ({
  Accuracy: {
    Balanced: 3,
    High: 4,
    BestForNavigation: 6,
  },
  hasStartedLocationUpdatesAsync: (...args) => mockHasStartedLocationUpdatesAsync(...args),
  stopLocationUpdatesAsync: (...args) => mockStopLocationUpdatesAsync(...args),
}));

jest.mock('expo-task-manager', () => ({
  isTaskDefined: jest.fn(() => false),
  defineTask: jest.fn(),
}));

jest.mock('../src/presentation/di/container.jsx', () => ({
  getContainer: jest.fn(() => ({
    routingDeps: {
      navigationSessionRepository: null,
      speechService: null,
    },
  })),
}));

import { processBackgroundNavigationLocations } from '../src/data/services/backgroundNavigationTask.jsx';
import * as TaskManager from 'expo-task-manager';

const registeredTaskCall = TaskManager.defineTask.mock.calls[0];

const route = {
  ok: true,
  type: 'road',
  distanceKm: 2.22,
  durationMin: 28,
  geometry: {
    type: 'LineString',
    coordinates: [
      [125.68, 7.30],
      [125.68, 7.29],
      [125.68, 7.28],
    ],
  },
  maneuvers: [
    { id: 'depart', kind: 'depart', instruction: 'Start south', distanceAlongKm: 0 },
    { id: 'continue', kind: 'continue', instruction: 'Continue straight', distanceAlongKm: 1.11 },
    { id: 'arrive', kind: 'arrive', instruction: 'Arrive', distanceAlongKm: 2.22 },
  ],
};

const activeSession = () => ({
  version: 2,
  sessionId: 'nav-background-1',
  status: 'active',
  startedAt: Date.now() - 60_000,
  savedAt: Date.now() - 1_000,
  request: {
    destinationId: 'samal',
    destinationName: 'Samal Island',
    target: { label: 'Destination', lat: 7.28, lng: 125.68 },
    multiStops: [],
    mode: 'walk',
    preference: 'direct',
  },
  navigationRoute: route,
  progress: {
    distanceAlongKm: 0,
    completedStopCount: 0,
    remainingKm: route.distanceKm,
    remainingMin: route.durationMin,
  },
  evidence: {},
  voiceGuidance: true,
  guidanceState: {
    maneuverId: null,
    stage: null,
  },
  backgroundEnabled: true,
  needsReroute: false,
  offRouteWarningSpoken: false,
});

const nativeLocation = ({ lat, lng, timestamp }) => ({
  coords: {
    latitude: lat,
    longitude: lng,
    accuracy: 5,
    heading: 180,
    speed: 1.2,
  },
  timestamp,
});

describe('background navigation task processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasStartedLocationUpdatesAsync.mockResolvedValue(true);
    mockStopLocationUpdatesAsync.mockResolvedValue(undefined);
  });

  test('registers the Android background task at module scope', () => {
    expect(registeredTaskCall).toEqual([
      'lakbai-background-navigation',
      expect.any(Function),
    ]);
  });

  test('advances and persists navigation while no screen is mounted', async () => {
    const session = activeSession();
    const navigationSessionRepository = {
      getActiveSession: jest.fn().mockResolvedValue(session),
      saveActiveSession: jest.fn().mockResolvedValue(undefined),
      clearActiveSession: jest.fn().mockResolvedValue(undefined),
    };
    const speechService = {
      speak: jest.fn().mockResolvedValue(undefined),
    };

    const result = await processBackgroundNavigationLocations([
      nativeLocation({ lat: 7.295, lng: 125.68, timestamp: 3_000 }),
    ], {
      navigationSessionRepository,
      speechService,
    });

    expect(result.active).toBe(true);
    expect(result.session.progress.distanceAlongKm).toBeGreaterThan(0);
    expect(result.session.progress.remainingKm).toBeLessThan(route.distanceKm);
    expect(navigationSessionRepository.saveActiveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'nav-background-1',
        progress: expect.objectContaining({
          distanceAlongKm: expect.any(Number),
        }),
      }),
    );
    expect(speechService.speak).toHaveBeenCalled();
    expect(navigationSessionRepository.clearActiveSession).not.toHaveBeenCalled();
  });

  test('clears the active session and foreground service on arrival', async () => {
    const session = activeSession();
    const navigationSessionRepository = {
      getActiveSession: jest.fn().mockResolvedValue(session),
      saveActiveSession: jest.fn().mockResolvedValue(undefined),
      clearActiveSession: jest.fn().mockResolvedValue(undefined),
    };
    const speechService = {
      speak: jest.fn().mockResolvedValue(undefined),
    };

    const result = await processBackgroundNavigationLocations([
      nativeLocation({ lat: 7.28, lng: 125.68, timestamp: 5_000 }),
    ], {
      navigationSessionRepository,
      speechService,
    });

    expect(result).toEqual(expect.objectContaining({
      active: false,
      arrived: true,
    }));
    expect(navigationSessionRepository.clearActiveSession).toHaveBeenCalledTimes(1);
    expect(mockStopLocationUpdatesAsync).toHaveBeenCalledWith(
      'lakbai-background-navigation',
    );
    expect(result.session.status).toBe('arrived');
  });

  test('stops an orphaned service when no live navigation session remains', async () => {
    const navigationSessionRepository = {
      getActiveSession: jest.fn().mockResolvedValue(null),
      saveActiveSession: jest.fn(),
      clearActiveSession: jest.fn(),
    };

    const result = await processBackgroundNavigationLocations([], {
      navigationSessionRepository,
      speechService: null,
    });

    expect(result).toEqual({ active: false, session: null });
    expect(mockStopLocationUpdatesAsync).toHaveBeenCalledWith(
      'lakbai-background-navigation',
    );
    expect(navigationSessionRepository.saveActiveSession).not.toHaveBeenCalled();
  });
});
