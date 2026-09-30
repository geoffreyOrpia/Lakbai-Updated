import * as Location from 'expo-location';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { BACKGROUND_NAVIGATION_TASK } from "./backgroundNavigationConstants.jsx";

const SNAPSHOT_MAX_AGE_MS = 5 * 60 * 1000;
const SNAPSHOT_MAX_ACCURACY_M = 250;
const SNAPSHOT_WRITE_INTERVAL_MS = 20_000;
const WATCH_STALL_MS = 20_000;
const WATCHDOG_INTERVAL_MS = 5_000;

const FIX_PROFILES = Object.freeze({
  legacy: {
    maxAgeMs: 5 * 60 * 1000,
    fastMaxAgeMs: 5 * 60 * 1000,
    maxAccuracyM: 250,
    fastAccuracyM: 80,
    timeoutMs: 6_000,
    accuracy: 'balanced',
  },
  discovery: {
    maxAgeMs: 2 * 60 * 1000,
    fastMaxAgeMs: 15_000,
    maxAccuracyM: 250,
    fastAccuracyM: 120,
    timeoutMs: 6_000,
    accuracy: 'balanced',
  },
  route: {
    maxAgeMs: 30_000,
    fastMaxAgeMs: 10_000,
    maxAccuracyM: 250,
    fastAccuracyM: 80,
    timeoutMs: 7_000,
    accuracy: 'high',
  },
  navigation: {
    maxAgeMs: 10_000,
    fastMaxAgeMs: 5_000,
    maxAccuracyM: 100,
    fastAccuracyM: 60,
    timeoutMs: 7_000,
    accuracy: 'navigation',
  },
  trail: {
    maxAgeMs: 10_000,
    fastMaxAgeMs: 5_000,
    maxAccuracyM: 80,
    fastAccuracyM: 50,
    timeoutMs: 7_000,
    accuracy: 'navigation',
  },
});

const profileFor = purpose => FIX_PROFILES[purpose] ?? FIX_PROFILES.legacy;

const expoAccuracyFor = profile => {
  if (profile.accuracy === 'navigation') {
    return Location.Accuracy.BestForNavigation ?? Location.Accuracy.High;
  }
  if (profile.accuracy === 'high') {
    return Location.Accuracy.High ?? Location.Accuracy.Balanced;
  }
  return Location.Accuracy.Balanced ?? Location.Accuracy.High;
};

const fixAgeMs = (fix, now = Date.now()) => (
  Number.isFinite(fix?.timestamp) ? Math.max(0, now - fix.timestamp) : Number.POSITIVE_INFINITY
);

const usableFix = (fix, profile, now = Date.now()) => {
  if (!fix || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lng)) return false;
  if (fixAgeMs(fix, now) > profile.maxAgeMs) return false;
  if (Number.isFinite(fix.accuracy) && fix.accuracy > profile.maxAccuracyM) return false;
  return true;
};

const fastFix = (fix, profile, now = Date.now()) => (
  usableFix(fix, profile, now)
  && fixAgeMs(fix, now) <= (profile.fastMaxAgeMs ?? profile.maxAgeMs)
  && (fix.accuracy ?? Number.POSITIVE_INFINITY) <= profile.fastAccuracyM
);

const betterFix = (candidate, current, now = Date.now()) => {
  if (!candidate) return current ?? null;
  if (!current) return candidate;
  const candidateAge = fixAgeMs(candidate, now);
  const currentAge = fixAgeMs(current, now);
  const candidateAccuracy = candidate.accuracy ?? Number.POSITIVE_INFINITY;
  const currentAccuracy = current.accuracy ?? Number.POSITIVE_INFINITY;

  if (candidateAge + 15_000 < currentAge) return candidate;
  if (currentAge + 15_000 < candidateAge) return current;
  return candidateAccuracy <= currentAccuracy ? candidate : current;
};

const currentPositionWithTimeout = async profile => {
  let timeoutId;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: expoAccuracyFor(profile),
      }),
      new Promise(resolve => {
        timeoutId = setTimeout(() => resolve(null), profile.timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
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
    timestamp: Number.isFinite(location.timestamp) ? location.timestamp : Date.now(),
    source,
  };
};

const persistedFixToRuntimeFix = value => {
  if (!value || !Number.isFinite(value.lat) || !Number.isFinite(value.lng)) return null;
  return {
    lat: value.lat,
    lng: value.lng,
    accuracy: value.accuracy ?? null,
    heading: value.heading ?? null,
    speed: value.speed ?? null,
    timestamp: value.timestamp,
    source: 'persisted',
  };
};

const appIsActive = () => !AppState?.currentState || AppState.currentState === 'active';

/**
 * Shared Expo Location runtime.
 *
 * The container creates exactly one instance. All screens therefore share the same recent fix,
 * foreground native watcher and lifecycle recovery instead of competing for independent GPS state.
 */
export class ExpoLocationService {
  constructor({ snapshotStore = null, now = () => Date.now() } = {}) {
    this.snapshotStore = snapshotStore;
    this.now = now;
    this.lastFix = null;
    this.lastGoodFix = null;
    this.snapshotHydrated = false;
    this.snapshotHydrationPromise = null;
    this.lastSnapshotSavedAt = 0;
    this.subscribers = new Map();
    this.nextSubscriberId = 0;
    this.nativeUnwatch = null;
    this.watchStartPromise = null;
    this.watchGeneration = 0;
    this.lastNativeFixAt = null;
    this.watchdogTimer = null;
    this.watchdogRecovering = false;
    this.lastWatchdogRecoveryAt = 0;
    this.appStateSubscription = AppState?.addEventListener?.('change', this.handleAppStateChange) ?? null;
  }

  requestPermissions = async () => {
    try {
      if (typeof Location.getForegroundPermissionsAsync === 'function') {
        const current = await Location.getForegroundPermissionsAsync();
        if (current?.granted) return true;
      }
      const response = await Location.requestForegroundPermissionsAsync();
      return response.granted;
    } catch {
      return false;
    }
  };

  getProviderHealth = async () => {
    let servicesEnabled = true;
    let providerStatus = null;
    try {
      if (typeof Location.hasServicesEnabledAsync === 'function') {
        servicesEnabled = await Location.hasServicesEnabledAsync();
      }
      if (typeof Location.getProviderStatusAsync === 'function') {
        providerStatus = await Location.getProviderStatusAsync();
      }
    } catch {
      // Provider diagnostics are advisory; GPS acquisition still gets a chance to proceed.
    }
    return {
      servicesEnabled,
      providerStatus,
      gpsAvailable: providerStatus?.gpsAvailable ?? null,
      networkAvailable: providerStatus?.networkAvailable ?? null,
      locationServicesEnabled: providerStatus?.locationServicesEnabled ?? servicesEnabled,
    };
  };

  locationFailureMessage = async fallback => {
    const health = await this.getProviderHealth();
    if (!health.servicesEnabled || health.locationServicesEnabled === false) {
      return 'Device location is turned off. Turn on Location, then try again.';
    }
    if (health.gpsAvailable === false && health.networkAvailable === false) {
      return 'No location provider is available right now. Check your phone Location settings.';
    }
    return fallback;
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

  hydrateSnapshot = async () => {
    if (this.snapshotHydrated) return;
    if (this.snapshotHydrationPromise) return this.snapshotHydrationPromise;
    this.snapshotHydrationPromise = (async () => {
      try {
        const stored = await this.snapshotStore?.get?.();
        const fix = persistedFixToRuntimeFix(stored);
        const profile = {
          maxAgeMs: SNAPSHOT_MAX_AGE_MS,
          maxAccuracyM: SNAPSHOT_MAX_ACCURACY_M,
        };
        if (usableFix(fix, profile, this.now())) {
          this.lastFix = betterFix(fix, this.lastFix, this.now());
          this.lastGoodFix = betterFix(fix, this.lastGoodFix, this.now());
        } else if (stored) {
          void Promise.resolve(this.snapshotStore?.clear?.()).catch(() => {});
        }
      } catch {
        // A missing/corrupt cache must never block live GPS.
      } finally {
        this.snapshotHydrated = true;
        this.snapshotHydrationPromise = null;
      }
    })();
    return this.snapshotHydrationPromise;
  };

  persistSnapshot = fix => {
    if (!this.snapshotStore?.save || !fix) return;
    const now = this.now();
    if (now - this.lastSnapshotSavedAt < SNAPSHOT_WRITE_INTERVAL_MS) return;
    this.lastSnapshotSavedAt = now;
    void Promise.resolve(this.snapshotStore.save({
      lat: fix.lat,
      lng: fix.lng,
      accuracy: fix.accuracy ?? null,
      heading: fix.heading ?? null,
      speed: fix.speed ?? null,
      timestamp: fix.timestamp,
    })).catch(() => {});
  };

  rememberFix = (fix, { persist = true } = {}) => {
    if (!fix) return null;
    const now = this.now();
    this.lastFix = betterFix(fix, this.lastFix, now);
    if (
      fixAgeMs(fix, now) <= SNAPSHOT_MAX_AGE_MS
      && (!Number.isFinite(fix.accuracy) || fix.accuracy <= SNAPSHOT_MAX_ACCURACY_M)
    ) {
      this.lastGoodFix = betterFix(fix, this.lastGoodFix, now);
      if (persist) this.persistSnapshot(fix);
    }
    return fix;
  };

  getCurrentFix = async ({ purpose = 'legacy', forceFresh = false } = {}) => {
    const profile = profileFor(purpose);
    await this.hydrateSnapshot();

    const now = this.now();
    if (!forceFresh && fastFix(this.lastGoodFix, profile, now)) {
      return {
        ...this.lastGoodFix,
        source: this.lastGoodFix.source ?? 'memory',
      };
    }

    let bestFallback = usableFix(this.lastGoodFix, profile, now)
      ? this.lastGoodFix
      : null;

    try {
      if (typeof Location.getLastKnownPositionAsync === 'function') {
        const lastKnownLocation = await Location.getLastKnownPositionAsync({
          maxAge: profile.maxAgeMs,
          requiredAccuracy: profile.maxAccuracyM,
        });
        const lastKnown = locationObjectToFix(lastKnownLocation, 'last-known');
        if (usableFix(lastKnown, profile, this.now())) {
          this.rememberFix(lastKnown);
          bestFallback = betterFix(lastKnown, bestFallback, this.now());
          if (!forceFresh && fastFix(lastKnown, profile, this.now())) {
            return lastKnown;
          }
        }
      }
    } catch {
      // Continue to an active fix or app-owned recent fallback.
    }

    try {
      const current = await currentPositionWithTimeout(profile);
      const fix = locationObjectToFix(current, 'current');
      if (fix && usableFix(fix, profile, this.now())) {
        this.rememberFix(fix);
        return fix;
      }
    } catch {
      // A recent cached fix is still useful when fresh GPS times out.
    }

    return usableFix(bestFallback, profile, this.now()) ? bestFallback : null;
  };

  dispatchFix = fix => {
    if (!fix) return;
    for (const subscriber of this.subscribers.values()) {
      if (
        Number.isFinite(fix.timestamp)
        && Number.isFinite(subscriber.lastTimestamp)
        && fix.timestamp <= subscriber.lastTimestamp
      ) {
        continue;
      }
      subscriber.lastTimestamp = fix.timestamp ?? this.now();
      try {
        subscriber.onFix(fix);
      } catch {
        // One consumer must not break GPS delivery to the others.
      }
    }
  };

  dispatchError = message => {
    for (const subscriber of this.subscribers.values()) {
      try {
        subscriber.onError?.(message);
      } catch {
        // One consumer must not break GPS recovery for the others.
      }
    }
  };

  ensureForegroundWatch = async () => {
    if (!this.subscribers.size || !appIsActive()) return;
    if (this.nativeUnwatch) return;
    if (this.watchStartPromise) return this.watchStartPromise;

    const generation = ++this.watchGeneration;
    this.watchStartPromise = (async () => {
      const subscription = await Location.watchPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 3,
        timeInterval: 2000,
      }, location => {
        if (generation !== this.watchGeneration) return;
        const fix = locationObjectToFix(location, 'current');
        if (!fix) return;
        this.lastNativeFixAt = this.now();
        this.rememberFix(fix);
        this.dispatchFix(fix);
      }, async error => {
        if (generation !== this.watchGeneration) return;
        const message = await this.locationFailureMessage(
          String(error || 'Location updates are temporarily unavailable.'),
        );
        this.dispatchError(message);
      });
      if (generation !== this.watchGeneration || !this.subscribers.size || !appIsActive()) {
        subscription.remove();
        return;
      }
      this.nativeUnwatch = () => subscription.remove();
      this.lastNativeFixAt = this.now();
      this.scheduleWatchdog();
    })();

    try {
      await this.watchStartPromise;
    } finally {
      this.watchStartPromise = null;
    }
  };

  stopForegroundWatch = () => {
    this.watchGeneration += 1;
    this.nativeUnwatch?.();
    this.nativeUnwatch = null;
    this.watchStartPromise = null;
    this.clearWatchdog();
  };

  restartForegroundWatch = async () => {
    if (!this.subscribers.size || !appIsActive()) return;
    this.stopForegroundWatch();
    await this.ensureForegroundWatch();
  };

  clearWatchdog = () => {
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.watchdogTimer = null;
  };

  scheduleWatchdog = () => {
    this.clearWatchdog();
    if (!this.subscribers.size || !appIsActive()) return;
    this.watchdogTimer = setTimeout(() => {
      void this.runWatchdog();
    }, WATCHDOG_INTERVAL_MS);
    this.watchdogTimer?.unref?.();
  };

  runWatchdog = async () => {
    this.watchdogTimer = null;
    if (!this.subscribers.size || !appIsActive()) return;
    const now = this.now();
    const stalled = this.lastNativeFixAt != null && now - this.lastNativeFixAt >= WATCH_STALL_MS;
    const cooldownPassed = now - this.lastWatchdogRecoveryAt >= WATCH_STALL_MS;

    if (stalled && cooldownPassed && !this.watchdogRecovering) {
      this.watchdogRecovering = true;
      this.lastWatchdogRecoveryAt = now;
      this.dispatchError('GPS signal is taking longer than expected. LakBai is reconnecting…');
      try {
        const fix = await this.getCurrentFix({ purpose: 'navigation', forceFresh: true });
        if (fix) this.dispatchFix(fix);
        await this.restartForegroundWatch();
      } catch {
        const message = await this.locationFailureMessage(
          'GPS updates are temporarily unavailable. LakBai will keep trying while this screen is open.',
        );
        this.dispatchError(message);
      } finally {
        this.watchdogRecovering = false;
      }
    }

    this.scheduleWatchdog();
  };

  handleAppStateChange = nextState => {
    if (!this.subscribers.size) return;
    if (nextState === 'active') {
      void (async () => {
        try {
          const fix = await this.getCurrentFix({ purpose: 'navigation' });
          if (fix) this.dispatchFix(fix);
          await this.restartForegroundWatch();
        } catch {
          const message = await this.locationFailureMessage(
            'LakBai could not resume live GPS yet. It will keep trying.',
          );
          this.dispatchError(message);
        }
      })();
      return;
    }
    this.stopForegroundWatch();
  };

  watchFix = async (onFix, onError, { purpose = 'navigation' } = {}) => {
    const id = ++this.nextSubscriberId;
    this.subscribers.set(id, {
      onFix,
      onError,
      purpose,
      lastTimestamp: null,
    });

    try {
      await this.ensureForegroundWatch();
    } catch (error) {
      this.subscribers.delete(id);
      if (!this.subscribers.size) this.stopForegroundWatch();
      throw error;
    }

    return () => {
      this.subscribers.delete(id);
      if (!this.subscribers.size) this.stopForegroundWatch();
    };
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
