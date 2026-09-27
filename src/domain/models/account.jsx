export const TRAVEL_PACES = Object.freeze(['chill', 'balanced', 'packed']);

export const createTravelPreferences = ({
  interests = [],
  pace = 'balanced',
  offlineFirst = true,
} = {}) => ({
  interests: [...interests],
  pace: TRAVEL_PACES.includes(pace) ? pace : 'balanced',
  offlineFirst: Boolean(offlineFirst),
});
