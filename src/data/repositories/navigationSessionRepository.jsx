export const ACTIVE_NAVIGATION_SESSION_VERSION = 2;
const LEGACY_MULTI_STOP_SESSION_VERSION = 1;
const DEFAULT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const ACTIVE_NAVIGATION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const DEFAULT_FUTURE_TOLERANCE_MS = 10 * 60 * 1000;
const VALID_MODES = new Set(['walk', 'drive']);
const VALID_PREFERENCES = new Set(['direct', 'scenic', 'easy', 'adventure']);

const finiteCoordinate = (value, min, max) => (
  Number.isFinite(value) && value >= min && value <= max
);

const validTarget = target => (
  target
  && typeof target === 'object'
  && finiteCoordinate(target.lat, -90, 90)
  && finiteCoordinate(target.lng, -180, 180)
);

const validStop = stop => (
  stop
  && typeof stop === 'object'
  && typeof stop.destinationId === 'string'
  && stop.destinationId.trim().length > 0
  && typeof stop.name === 'string'
  && stop.name.trim().length > 0
  && validTarget(stop.target)
);

const savedAtIsValid = (session, now, maxAgeMs, futureToleranceMs) => (
  Number.isFinite(session?.savedAt)
  && session.savedAt <= now + futureToleranceMs
  && now - session.savedAt <= maxAgeMs
);

const legacyMultiStopSessionIsValid = (
  session,
  { now, maxAgeMs, futureToleranceMs },
) => {
  if (session.version !== LEGACY_MULTI_STOP_SESSION_VERSION) return false;
  if (!savedAtIsValid(session, now, maxAgeMs, futureToleranceMs)) return false;

  const route = session.route;
  if (!route || typeof route !== 'object') return false;
  if (!Array.isArray(route.multiStops) || route.multiStops.length === 0) return false;
  if (!route.multiStops.every(validStop)) return false;
  if (!VALID_MODES.has(route.mode)) return false;
  if (!VALID_PREFERENCES.has(route.preference)) return false;

  const completedStopCount = session.completedStopCount;
  if (!Number.isInteger(completedStopCount) || completedStopCount < 0) return false;
  if (completedStopCount >= route.multiStops.length) return false;

  if (route.target != null && !validTarget(route.target)) return false;
  if (route.tripId != null && typeof route.tripId !== 'string') return false;
  if (route.destinationId != null && typeof route.destinationId !== 'string') return false;

  return true;
};

const validNavigationRoute = route => (
  route
  && typeof route === 'object'
  && route.ok !== false
  && Number.isFinite(route.distanceKm)
  && route.distanceKm >= 0
  && Array.isArray(route.maneuvers)
);

const activeSessionV2IsValid = (
  session,
  { now, maxAgeMs, futureToleranceMs },
) => {
  if (session.version !== ACTIVE_NAVIGATION_SESSION_VERSION) return false;
  if (session.status !== 'active') return false;
  if (typeof session.sessionId !== 'string' || !session.sessionId.trim()) return false;
  const activeMaxAgeMs = Math.min(maxAgeMs, ACTIVE_NAVIGATION_MAX_AGE_MS);
  if (!savedAtIsValid(session, now, activeMaxAgeMs, futureToleranceMs)) return false;
  if (!Number.isFinite(session.startedAt)) return false;
  if (session.startedAt > now + futureToleranceMs) return false;

  const request = session.request;
  if (!request || typeof request !== 'object') return false;
  if (!VALID_MODES.has(request.mode)) return false;
  if (!VALID_PREFERENCES.has(request.preference)) return false;
  if (!validTarget(request.target)) return false;
  if (request.destinationId != null && typeof request.destinationId !== 'string') return false;
  if (request.destinationName != null && typeof request.destinationName !== 'string') return false;

  const multiStops = Array.isArray(request.multiStops) ? request.multiStops : [];
  if (!multiStops.every(validStop)) return false;

  if (!validNavigationRoute(session.navigationRoute)) return false;

  const progress = session.progress;
  if (!progress || typeof progress !== 'object') return false;
  if (!Number.isFinite(progress.distanceAlongKm) || progress.distanceAlongKm < 0) return false;
  if (
    progress.distanceAlongKm
    > Math.max(0.25, session.navigationRoute.distanceKm + 0.25)
  ) return false;
  if (!Number.isInteger(progress.completedStopCount) || progress.completedStopCount < 0) return false;
  if (multiStops.length && progress.completedStopCount > multiStops.length) return false;

  return true;
};

export const isLiveNavigationSession = session => (
  session?.version === ACTIVE_NAVIGATION_SESSION_VERSION
  && session?.status === 'active'
);

export const activeNavigationSessionIsValid = (
  session,
  {
    now = Date.now(),
    maxAgeMs = DEFAULT_MAX_AGE_MS,
    futureToleranceMs = DEFAULT_FUTURE_TOLERANCE_MS,
  } = {},
) => {
  if (!session || typeof session !== 'object') return false;
  if (session.version === LEGACY_MULTI_STOP_SESSION_VERSION) {
    return legacyMultiStopSessionIsValid(session, {
      now,
      maxAgeMs,
      futureToleranceMs,
    });
  }
  if (session.version === ACTIVE_NAVIGATION_SESSION_VERSION) {
    return activeSessionV2IsValid(session, {
      now,
      maxAgeMs,
      futureToleranceMs,
    });
  }
  return false;
};

export const navigationRequestFromSession = session => {
  if (!isLiveNavigationSession(session)) return null;
  return {
    ...session.request,
    resumedSession: true,
    resumeNavigationSession: session,
  };
};

export class LocalNavigationSessionRepository {
  constructor(
    dao,
    {
      now = () => Date.now(),
      maxAgeMs = DEFAULT_MAX_AGE_MS,
      futureToleranceMs = DEFAULT_FUTURE_TOLERANCE_MS,
    } = {},
  ) {
    this.dao = dao;
    this.now = now;
    this.maxAgeMs = maxAgeMs;
    this.futureToleranceMs = futureToleranceMs;
  }

  saveActiveSession = session => this.dao.save(session);

  getActiveSession = async () => {
    const session = await this.dao.get();
    if (!session) return null;

    const valid = activeNavigationSessionIsValid(session, {
      now: this.now(),
      maxAgeMs: this.maxAgeMs,
      futureToleranceMs: this.futureToleranceMs,
    });
    if (valid) return session;

    try {
      await this.dao.clear();
    } catch {
      // An invalid checkpoint must never be resumed even if cleanup fails.
    }
    return null;
  };

  clearActiveSession = () => this.dao.clear();
}
