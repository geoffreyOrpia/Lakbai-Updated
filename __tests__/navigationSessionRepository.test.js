import {
  LocalNavigationSessionRepository,
  activeNavigationSessionIsValid,
  navigationRequestFromSession,
} from '../src/data/repositories/navigationSessionRepository.jsx';

const NOW = Date.UTC(2026, 8, 29, 12, 0, 0);

const validSession = overrides => ({
  version: 1,
  savedAt: NOW - 60_000,
  completedStopCount: 0,
  route: {
    destinationId: 'samal',
    destinationName: 'Samal Island',
    target: { label: 'Final stop', lat: 7.13, lng: 125.68 },
    multiStops: [{
      destinationId: 'samal',
      name: 'Stop one',
      target: { label: 'Stop one', lat: 7.12, lng: 125.69 },
    }, {
      destinationId: 'samal',
      name: 'Stop two',
      target: { label: 'Stop two', lat: 7.14, lng: 125.7 },
    }],
    tripId: 'trip-1',
    tripTitle: 'Samal day',
    mode: 'drive',
    preference: 'direct',
    coverage: 'samal',
  },
  ...overrides,
});

const validLiveSession = overrides => ({
  version: 2,
  sessionId: 'nav-live-1',
  status: 'active',
  startedAt: NOW - 5 * 60_000,
  savedAt: NOW - 30_000,
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
    distanceKm: 4.2,
    durationMin: 11,
    maneuvers: [],
  },
  progress: {
    distanceAlongKm: 1.2,
    completedStopCount: 0,
  },
  evidence: {},
  voiceGuidance: true,
  backgroundEnabled: true,
  ...overrides,
});

const createRepository = session => {
  const dao = {
    get: jest.fn().mockResolvedValue(session),
    save: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };
  return {
    dao,
    repository: new LocalNavigationSessionRepository(dao, {
      now: () => NOW,
    }),
  };
};

describe('LocalNavigationSessionRepository recovery validation', () => {
  test('returns a valid recent multi-stop session unchanged', async () => {
    const session = validSession();
    const { repository, dao } = createRepository(session);

    await expect(repository.getActiveSession()).resolves.toBe(session);
    expect(dao.clear).not.toHaveBeenCalled();
  });

  test.each([
    ['unsupported version', { version: 99 }],
    ['missing saved time', { savedAt: null }],
    ['stale checkpoint', { savedAt: NOW - 15 * 24 * 60 * 60 * 1000 }],
    ['far-future checkpoint', { savedAt: NOW + 11 * 60 * 1000 }],
    ['completed journey', { completedStopCount: 2 }],
    ['invalid negative progress', { completedStopCount: -1 }],
  ])('discards and clears %s', async (_label, override) => {
    const { repository, dao } = createRepository(validSession(override));

    await expect(repository.getActiveSession()).resolves.toBeNull();
    expect(dao.clear).toHaveBeenCalledTimes(1);
  });

  test('discards malformed or geographically invalid stops', async () => {
    const session = validSession();
    session.route.multiStops[0] = {
      destinationId: 'samal',
      name: 'Broken stop',
      target: { lat: 181, lng: 125.69 },
    };
    const { repository, dao } = createRepository(session);

    await expect(repository.getActiveSession()).resolves.toBeNull();
    expect(dao.clear).toHaveBeenCalledTimes(1);
  });

  test('discards invalid routing mode and preference values', () => {
    const badMode = validSession();
    badMode.route = { ...badMode.route, mode: 'fly' };
    const badPreference = validSession();
    badPreference.route = { ...badPreference.route, preference: 'fastest' };

    expect(activeNavigationSessionIsValid(badMode, { now: NOW })).toBe(false);
    expect(activeNavigationSessionIsValid(badPreference, { now: NOW })).toBe(false);
  });

  test('returns null rather than resuming if cleanup of an invalid checkpoint fails', async () => {
    const { repository, dao } = createRepository(validSession({ version: 99 }));
    dao.clear.mockRejectedValue(new Error('storage unavailable'));

    await expect(repository.getActiveSession()).resolves.toBeNull();
  });

  test('does not clear storage when no checkpoint exists', async () => {
    const { repository, dao } = createRepository(null);

    await expect(repository.getActiveSession()).resolves.toBeNull();
    expect(dao.clear).not.toHaveBeenCalled();
  });

  test('restores a recent active background-navigation session', async () => {
    const session = validLiveSession();
    const { repository, dao } = createRepository(session);

    await expect(repository.getActiveSession()).resolves.toBe(session);
    expect(dao.clear).not.toHaveBeenCalled();
    expect(navigationRequestFromSession(session)).toEqual(expect.objectContaining({
      destinationId: 'samal',
      resumedSession: true,
      resumeNavigationSession: session,
    }));
  });

  test('expires a live navigation session after the bounded recovery window', async () => {
    const { repository, dao } = createRepository(validLiveSession({
      startedAt: NOW - 13 * 60 * 60 * 1000,
      savedAt: NOW - 13 * 60 * 60 * 1000,
    }));

    await expect(repository.getActiveSession()).resolves.toBeNull();
    expect(dao.clear).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['missing route', { navigationRoute: null }],
    ['invalid route distance', { navigationRoute: { distanceKm: -1, maneuvers: [] } }],
    ['progress beyond the route', { progress: { distanceAlongKm: 10, completedStopCount: 0 } }],
    ['invalid live status', { status: 'arrived' }],
  ])('rejects live session with %s', (_label, override) => {
    expect(activeNavigationSessionIsValid(validLiveSession(override), { now: NOW })).toBe(false);
  });
});
