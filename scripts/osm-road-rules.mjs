const DRIVE_HIGHWAYS = new Set([
  'motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link',
  'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'unclassified',
  'residential', 'living_street', 'service', 'road',
]);
const WALK_EXCLUDED = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link']);
const UNBUILT = new Set(['construction', 'proposed', 'abandoned', 'razed']);
const PUBLIC_ACCESS = new Set(['yes', 'designated', 'permissive']);
const value = tag => String(tag ?? '').trim().toLowerCase();
const modeKeys = mode => mode === 'walk' ? ['foot', 'access'] : ['motorcar', 'motor_vehicle', 'vehicle', 'access'];
const permitted = (tags, keys, fallback) => {
  for (const key of keys) {
    if (tags[key] != null && value(tags[key]) !== '') return PUBLIC_ACCESS.has(value(tags[key]));
  }
  return fallback;
};
const oneWay = tag => {
  if (['yes', 'true', '1'].includes(value(tag))) return 1;
  if (value(tag) === '-1') return -1;
  return 0;
};

// Conservative public-through-routing policy. Destination/customer-only access
// and conditional permissions need a richer trip model before they can be used.
export const roadPermissions = tags => {
  const highway = value(tags.highway);
  if (!highway || UNBUILT.has(highway)) return { walk: false, drive: false };
  const allowed = mode => {
    const keys = modeKeys(mode);
    if (keys.some(key => tags[key + ':conditional'])) return false;
    return permitted(tags, keys, mode === 'walk' ? !WALK_EXCLUDED.has(highway) : DRIVE_HIGHWAYS.has(highway));
  };
  return { walk: allowed('walk'), drive: allowed('drive') };
};

export const directedRoadPermissions = (tags, forward) => {
  const modes = roadPermissions(tags);
  const driveOneWay = oneWay(tags['oneway:motorcar'] ?? tags['oneway:motor_vehicle'] ?? tags.oneway
    ?? (tags.junction === 'roundabout' || tags.highway === 'motorway' ? 'yes' : 'no'));
  const walkOneWay = oneWay(tags['oneway:foot']);
  const direction = forward ? 'forward' : 'backward';
  return Object.fromEntries(['walk', 'drive'].map(mode => {
    const oneWayValue = mode === 'walk' ? walkOneWay : driveOneWay;
    const directionAllowed = oneWayValue === 0 || (forward ? oneWayValue === 1 : oneWayValue === -1);
    const keys = modeKeys(mode).map(key => key + ':' + direction);
    const conditional = keys.some(key => tags[key + ':conditional'])
      || tags[mode === 'walk' ? 'oneway:foot:conditional' : 'oneway:conditional'];
    return [mode, modes[mode] && directionAllowed && !conditional && permitted(tags, keys, true)];
  }));
};
