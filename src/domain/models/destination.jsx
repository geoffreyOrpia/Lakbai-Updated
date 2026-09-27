export const DESTINATION_CATEGORIES = Object.freeze([
  'island',
  'city',
  'nature',
  'adventure',
]);

export const DESTINATION_STATUSES = Object.freeze(['available', 'coming-soon']);

export const isDestinationCategory = (value) => DESTINATION_CATEGORIES.includes(value);

export const isDestinationStatus = (value) => DESTINATION_STATUSES.includes(value);
