import * as Location from 'expo-location';
import { PermissionsAndroid, Platform } from 'react-native';
import { BACKGROUND_NAVIGATION_TASK } from "./backgroundNavigationConstants.jsx";

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

export const locationObjectToFix = (location, source = 'current') => {
  const latitude = location?.coords?.latitude;
  const longitude = location?.coords?.longitude;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    lat: latitude,
    lng: longitude,
    accuracy: location.coords.accuracy,
    heading: location.coords.heading,
    speed: location.coords.speed,
    timestamp: location.timestamp,
    source,
  };
};

/** Expo Location wrapper implementing the domain location contract. */
export class ExpoLocationService {
  requestPermissions = async () => {
    const response = await Location.requestForegroundPermissionsAsync();
    return response.granted;
  };

  requestBackgroundNavigationPermissions = async () => {
    if (Platform.OS !== 'android') return false;
    const foreground = typeof Location.getForegroundPermissionsAsync === 'function'
      ? await Location.getForegroundPermissionsAsync()
      : null;
    if (!foreground?.granted) {
      const requestedForeground = await Location.requestForegroundPermissionsAsync();
      if (!requestedForeground.granted) return false;
    }

    const existing = typeof Location.getBackgroundPermissionsAsync === 'function'
      ? await Location.getBackgroundPermissionsAsync()
      : null;
    if (existing?.granted) return true;

    const response = await Location.requestBackgroundPermissionsAsync();
    return response.granted;
  };

  requestNavigationNotificationPermission = async () => {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return true;
    const permission = PermissionsAndroid?.PERMISSIONS?.POST_NOTIFICATIONS;
    if (!permission || typeof PermissionsAndroid?.request !== 'function') return false;
    try {
      if (
        typeof PermissionsAndroid.check === 'function'
        && await PermissionsAndroid.check(permission)
      ) {
        return true;
      }
      const result = await PermissionsAndroid.request(permission, {
        title: 'Keep LakBai navigation visible',
        message: 'Allow notifications so LakBai can show your ongoing navigation status while your screen is locked or another app is open.',
        buttonPositive: 'Allow',
        buttonNegative: 'Not now',
      });
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
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
      return locationObjectToFix(lastKnown, 'last-known');
    }

    try {
      const current = await currentPositionWithTimeout();
      if (current) return locationObjectToFix(current, 'current');
    } catch {
      // A recent cached fix is still useful indoors when a fresh GPS fix times out.
    }

    return usableLastKnown(lastKnown) ? locationObjectToFix(lastKnown, 'last-known') : null;
  };

  watchFix = async (onFix, onError) => {
    const subscription = await Location.watchPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 3,
      timeInterval: 2000,
    }, location => {
      const fix = locationObjectToFix(location, 'current');
      if (fix) onFix(fix);
    }, error => onError?.(String(error)));
    return () => subscription.remove();
  };

  startBackgroundNavigation = async ({ destinationName } = {}) => {
    if (Platform.OS !== 'android') return false;
    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_NAVIGATION_TASK,
    );
    if (alreadyStarted) return true;

    await Location.startLocationUpdatesAsync(BACKGROUND_NAVIGATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 3,
      timeInterval: 2000,
      deferredUpdatesDistance: 0,
      deferredUpdatesInterval: 0,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: 'LakBai navigation active',
        notificationBody: destinationName
          ? `Navigating to ${destinationName}. Directions continue while your screen is locked.`
          : 'Directions continue while your screen is locked.',
        notificationColor: '#0F5132',
        killServiceOnDestroy: false,
      },
    });
    return true;
  };

  stopBackgroundNavigation = async () => {
    if (Platform.OS !== 'android') return;
    try {
      const started = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_NAVIGATION_TASK,
      );
      if (started) await Location.stopLocationUpdatesAsync(BACKGROUND_NAVIGATION_TASK);
    } catch {
      // Cleanup is best-effort; stale sessions are also cleared independently.
    }
  };

  isBackgroundNavigationActive = async () => {
    if (Platform.OS !== 'android') return false;
    try {
      return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_NAVIGATION_TASK);
    } catch {
      return false;
    }
  };
}
