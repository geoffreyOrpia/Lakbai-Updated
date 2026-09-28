const PUBLIC = new Set(['yes', 'designated', 'permissive']);
const WALK_THROUGH = new Set(['bollard', 'block', 'cycle_barrier', 'stile', 'turnstile', 'wicket_gate', 'kerb', 'chain', 'rope', 'log', 'kissing_gate']);
const OPEN = new Set(['entrance', 'cattle_grid', 'toll_booth', 'border_control', 'no']);
const GATES = new Set(['gate', 'lift_gate', 'swing_gate', 'sliding_gate', 'sliding_beam', 'bump_gate']);
const value = tag => String(tag ?? '').trim().toLowerCase();
export const modeAccessKeys = mode => mode === 'walk' ? ['foot'] : ['motorcar', 'motor_vehicle', 'vehicle'];

export const accessPermission = (tags = {}, mode) => {
  const keys = [...modeAccessKeys(mode), 'access'];
  // No clock/permit model yet. Conditional access cannot establish permission.
  if (keys.some(key => tags[key + ':conditional'])) return false;
  for (const key of keys) {
    if (value(tags[key])) return PUBLIC.has(value(tags[key]));
  }
  return null;
};

export const edgeAccessAllowed = (edge, mode) => accessPermission(edge.osmTags, mode) !== false;

export const nodePassageAllowed = (node, mode) => {
  const tags = node?.osmTags ?? {};
  const permission = accessPermission(tags, mode);
  if (permission === false) return false;
  const barrier = value(tags.barrier);
  if (!barrier || OPEN.has(barrier)) return true;
  if (value(tags.locked) === 'yes') return false;
  // Explicit mode permission can describe a passable/removable barrier.
  if (modeAccessKeys(mode).some(key => PUBLIC.has(value(tags[key])))) return true;
  if (GATES.has(barrier)) return permission === true;
  // Generic access=yes does not make a bollard or wall passable by car.
  return mode === 'walk' && WALK_THROUGH.has(barrier);
};
