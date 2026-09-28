export const REPOSITORY_METHODS = Object.freeze({
  destination: Object.freeze(['getDestinations', 'getDestination']),
  pack: Object.freeze([
    'listManifests',
    'getBundledPack',
    'getSavedPack',
    'listSavedMeta',
    'getSavedMeta',
    'getOfflineBundleStatus',
    'savePack',
    'removePack',
  ]),
  preferences: Object.freeze(['get', 'save', 'clear']),
  itinerary: Object.freeze(['listItineraries', 'saveItinerary', 'deleteItinerary']),
  safety: Object.freeze([
    'listChecklist',
    'listCompletedKeys',
    'setCompleted',
    'resetChecklist',
  ]),
});

export const implementsRepository = (repository, methods) => (
  methods.every((method) => typeof repository?.[method] === 'function')
);
