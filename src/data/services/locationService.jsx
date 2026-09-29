import * as Location from 'expo-location';

const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;
const LAST_KNOWN_MAX_ACCURACY_M = 250;
const FAST_LAST_KNOWN_ACCURACY_M = 80;
const CURRENT_FIX_TIMEOUT_MS = 6000;

const currentPositionWithTimeout = async () => {
  let timeoutId;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced ?? Location.Accuracy.High,
      }),
      new Promise(resolve => {
        timeoutId = setTimeout(() => resolve(null), CURRENT_FIX_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const usableLastKnown = location => {
  if (!location?.coords) return false;
  const accuracy = location.coords.accuracy;
  if (Number.isFinite(accuracy) && accuracy > LAST_KNOWN_MAX_ACCURACY_M) return false;
  if (Number.isFinite(location.timestamp)
    && Date.now() - location.timestamp > LAST_KNOWN_MAX_AGE_MS) return false;
  return true;
};

/** Expo Location wrapper implementing the domain location contract. */
export class ExpoLocationService {
  requestPermissions = async () => {
    const response = await Location.requestForegroundPermissionsAsync();
    return response.granted;
  };

  getCurrentFix = async () => {
    let lastKnown = null;
    try {
      if (typeof Location.getLastKnownPositionAsync === 'function') {
        lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: LAST_KNOWN_MAX_AGE_MS,
          requiredAccuracy: LAST_KNOWN_MAX_ACCURACY_M,
        });
      }
    } catch {
      lastKnown = null;
    }

    if (usableLastKnown(lastKnown)
      && (lastKnown.coords.accuracy ?? Number.POSITIVE_INFINITY) <= FAST_LAST_KNOWN_ACCURACY_M) {
      return toFix(lastKnown, 'last-known');
    }

    try {
      const current = await currentPositionWithTimeout();
      if (current) return toFix(current, 'current');
    } catch {
      // A recent cached fix is still useful indoors when a fresh GPS fix times out.
    }

    return usableLastKnown(lastKnown) ? toFix(lastKnown, 'last-known') : null;
  };

  watchFix = async (onFix, onError) => {
    const subscription = await Location.watchPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 3,
      timeInterval: 2000,
    }, location => onFix(toFix(location, 'current')), error => onError?.(String(error)));
    return () => subscription.remove();
  };
}

const toFix = (location, source = 'current') => ({
  lat: location.coords.latitude,
  lng: location.coords.longitude,
  accuracy: location.coords.accuracy,
  heading: location.coords.heading,
  speed: location.coords.speed,
  timestamp: location.timestamp,
  source,
});
