export const saveTravelPreferences = (deps, preferences) => deps.preferencesRepository.save(preferences);
export const getTravelPreferences = deps => deps.preferencesRepository.get();
export const clearTravelPreferences = deps => deps.preferencesRepository.clear();
