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
        accuracy: Location.Accuracy.Balanced
      });
      return toFix(location);
    } catch {
      return null;
    }
  };
  watchFix = async (onFix, onError) => {
    const subscription = await Location.watchPositionAsync({
      accuracy: Location.Accuracy.High,
      distanceInterval: 8
    }, location => onFix(toFix(location)), error => onError?.(String(error)));
    return () => subscription.remove();
  };
}
const toFix = location => {
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy
  };
};
