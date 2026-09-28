const ACTIVE_SESSION_VERSION = 1;
const DEFAULT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
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

export const activeNavigationSessionIsValid = (
  session,
  {
    now = Date.now(),
    maxAgeMs = DEFAULT_MAX_AGE_MS,
    futureToleranceMs = DEFAULT_FUTURE_TOLERANCE_MS,
  } = {},
) => {
  if (!session || typeof session !== 'object') return false;
  if (session.version !== ACTIVE_SESSION_VERSION) return false;
  if (!Number.isFinite(session.savedAt)) return false;
  if (session.savedAt > now + futureToleranceMs) return false;
  if (now - session.savedAt > maxAgeMs) return false;

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
