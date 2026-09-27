const WALK_SPEED_KPH = 4.5;

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

export const routingProfile = mode => {
  if (mode === 'drive') {
    return {
      mode: 'drive',
      edgeCost: edge => edge.distanceKm / (edge.speedKph ?? DRIVE_SPEEDS_KPH[edge.highway] ?? 20),
      durationHours: edge => edge.distanceKm / (edge.speedKph ?? DRIVE_SPEEDS_KPH[edge.highway] ?? 20),
      heuristicHours: distanceKm => distanceKm / 80,
    };
  }

  return {
    mode: 'walk',
    edgeCost: edge => edge.distanceKm / WALK_SPEED_KPH,
    durationHours: edge => edge.distanceKm / WALK_SPEED_KPH,
    heuristicHours: distanceKm => distanceKm / WALK_SPEED_KPH,
  };
};
