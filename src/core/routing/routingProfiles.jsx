const WALK_SPEED_KPH = 4.5;

export const WALK_ROUTE_PREFERENCES = Object.freeze([
  'direct',
  'easy',
  'adventure',
]);

export const normalizeRoutePreference = preference => (
  WALK_ROUTE_PREFERENCES.includes(preference) ? preference : 'direct'
);

const EASY_HIGHWAY_PENALTY = Object.freeze({
  steps: 5,
  path: 2.4,
  track: 2.4,
  bridleway: 2,
  footway: 1.2,
});

const ADVENTURE_HIGHWAY_PENALTY = Object.freeze({
  primary: 1.6,
  secondary: 1.45,
  tertiary: 1.3,
  unclassified: 1.2,
  residential: 1.15,
  service: 1.1,
});

const ROUGH_SURFACES = new Set([
  'unpaved',
  'gravel',
  'fine_gravel',
  'ground',
  'dirt',
  'earth',
  'sand',
  'mud',
]);

const walkPreferencePenalty = (edge, preference) => {
  if (preference === 'easy') {
    const highwayPenalty = EASY_HIGHWAY_PENALTY[edge.highway] ?? 1;
    const surfacePenalty = ROUGH_SURFACES.has(String(edge.surface ?? '').toLowerCase()) ? 1.7 : 1;
    return highwayPenalty * surfacePenalty;
  }
  if (preference === 'adventure') {
    return ADVENTURE_HIGHWAY_PENALTY[edge.highway] ?? 1;
  }
  return 1;
};

const DRIVE_SPEEDS_KPH = Object.freeze({
  motorway: 80,
  trunk: 70,
  primary: 55,
  secondary: 45,
  tertiary: 35,
  residential: 25,
  unclassified: 25,
  service: 15,
  living_street: 12,
});

export const routingProfile = (mode, preference = 'direct') => {
  if (mode === 'drive') {
    return {
      mode: 'drive',
      preference: 'direct',
      edgeCost: edge => edge.distanceKm / (edge.speedKph ?? DRIVE_SPEEDS_KPH[edge.highway] ?? 20),
      durationHours: edge => edge.distanceKm / (edge.speedKph ?? DRIVE_SPEEDS_KPH[edge.highway] ?? 20),
      heuristicHours: distanceKm => distanceKm / 80,
    };
  }

  const normalizedPreference = normalizeRoutePreference(preference);
  return {
    mode: 'walk',
    preference: normalizedPreference,
    edgeCost: edge => (
      edge.distanceKm / WALK_SPEED_KPH
      * walkPreferencePenalty(edge, normalizedPreference)
    ),
    durationHours: edge => edge.distanceKm / WALK_SPEED_KPH,
    heuristicHours: distanceKm => distanceKm / WALK_SPEED_KPH,
  };
};
