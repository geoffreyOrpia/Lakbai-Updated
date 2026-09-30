export const spokenDistance = distanceKm => {
  if (distanceKm == null) return null;
  if (distanceKm >= 1) {
    const rounded = Math.round(distanceKm * 10) / 10;
    return `${rounded} kilometer${rounded === 1 ? '' : 's'}`;
  }
  const meters = distanceKm * 1000;
  const rounded = meters >= 100
    ? Math.max(10, Math.round(meters / 10) * 10)
    : Math.max(5, Math.round(meters / 5) * 5);
  return `${rounded} meters`;
};

export const guidanceStage = distanceKm => {
  if (distanceKm == null) return 'preview';
  const meters = distanceKm * 1000;
  if (meters <= 25) return 'now';
  if (meters <= 120) return 'near';
  return 'preview';
};

export const spokenGuidance = (maneuver, distanceKm, stage = guidanceStage(distanceKm)) => {
  if (!maneuver?.instruction) return null;
  if (maneuver.kind === 'arrive' && stage === 'now') return maneuver.instruction;
  if (stage === 'now') return maneuver.instruction;
  const distance = spokenDistance(distanceKm);
  return distance ? `In ${distance}. ${maneuver.instruction}` : maneuver.instruction;
};

export const guidanceAnnouncement = ({
  maneuver,
  distanceKm,
  force = false,
  previousManeuverId = null,
  previousStage = null,
}) => {
  if (!maneuver) return null;
  const stage = guidanceStage(distanceKm);
  if (!force && previousManeuverId === maneuver.id && previousStage === stage) return null;
  const text = spokenGuidance(maneuver, distanceKm, stage);
  if (!text) return null;
  return {
    text,
    maneuverId: maneuver.id ?? null,
    stage,
  };
};
