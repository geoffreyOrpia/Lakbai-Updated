import * as Location from 'expo-location';

/** Expo Location wrapper implementing the domain location contract. */
export class ExpoLocationService {
  requestPermissions = async () => {
    const response = await Location.requestForegroundPermissionsAsync();
    return response.granted;
  };
  getCurrentFix = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation
      });
      return toFix(location);
    } catch {
      return null;
    }
  };
  watchFix = async (onFix, onError) => {
    const subscription = await Location.watchPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 3,
      timeInterval: 2000
    }, location => onFix(toFix(location)), error => onError?.(String(error)));
    return () => subscription.remove();
  };
}

const toFix = location => ({
  lat: location.coords.latitude,
  lng: location.coords.longitude,
  accuracy: location.coords.accuracy,
  heading: location.coords.heading,
  speed: location.coords.speed,
  timestamp: location.timestamp,
});
