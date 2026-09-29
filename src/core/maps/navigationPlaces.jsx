// Keep symbols, filters and the plain-language place details in agreement.
export const NAVIGATION_PLACE_TYPES = [
  { id: 'restaurant', group: 'food', label: 'Food', icon: 'restaurant', kinds: ['restaurant', 'fast_food', 'food_court', 'bakery', 'bbq', 'bar', 'pub'] },
  { id: 'cafe', group: 'food', label: 'Café', icon: 'cafe', kinds: ['cafe', 'coffee_shop'] },
  { id: 'hotel', group: 'stay', label: 'Place to stay', icon: 'bed', kinds: ['hotel', 'motel', 'hostel', 'guest_house', 'bed_and_breakfast', 'chalet', 'resort'] },
  { id: 'camp', group: 'stay', label: 'Campsite', icon: 'bonfire', kinds: ['camp_site', 'caravan_site'] },
  { id: 'medical', group: 'health', label: 'Hospital or clinic', icon: 'medkit', kinds: ['hospital', 'clinic', 'doctors', 'dentist'] },
  { id: 'pharmacy', group: 'health', label: 'Pharmacy', icon: 'medical', kinds: ['pharmacy'] },
  { id: 'police', group: 'safety', label: 'Police', icon: 'shield-checkmark', kinds: ['police', 'ranger_station'] },
  { id: 'fire', group: 'safety', label: 'Fire station', icon: 'flame', kinds: ['fire_station'] },
  { id: 'emergency', group: 'safety', label: 'Emergency phone', icon: 'call', kinds: ['emergency_phone'] },
  { id: 'transit', group: 'transport', label: 'Bus or transport stop', icon: 'bus', kinds: ['bus_stop', 'bus_station', 'station', 'halt', 'public_transport', 'transport'] },
  { id: 'ferry', group: 'transport', label: 'Ferry terminal', icon: 'boat', kinds: ['ferry_terminal', 'marina'] },
  { id: 'airport', group: 'transport', label: 'Airport', icon: 'airplane', kinds: ['aerodrome', 'airport'] },
  { id: 'taxi', group: 'transport', label: 'Taxi or car hire', icon: 'car', kinds: ['taxi', 'car_rental'] },
  { id: 'parking', group: 'transport', label: 'Parking', icon: 'car-sport', kinds: ['parking'] },
  { id: 'fuel', group: 'transport', label: 'Fuel', icon: 'speedometer', kinds: ['fuel'] },
  { id: 'charging', group: 'transport', label: 'Charging station', icon: 'flash', kinds: ['charging_station'] },
  { id: 'atm', group: 'money', label: 'ATM', icon: 'cash', kinds: ['atm'] },
  { id: 'bank', group: 'money', label: 'Bank or money exchange', icon: 'business', kinds: ['bank', 'bureau_de_change', 'money_transfer'] },
  { id: 'toilets', group: 'toilets', label: 'Toilets', icon: 'man', kinds: ['toilets'] },
  { id: 'water', group: 'water', label: 'Drinking water', icon: 'water', kinds: ['drinking_water', 'water_point'] },
  { id: 'shops', group: 'shops', label: 'Shop or market', icon: 'storefront', kinds: ['supermarket', 'convenience', 'marketplace', 'market', 'mall', 'department_store', 'general', 'gift', 'souvenir'] },
  { id: 'information', group: 'help', label: 'Visitor information', icon: 'information-circle', kinds: ['information', 'visitor_centre'] },
  { id: 'post', group: 'help', label: 'Post office', icon: 'mail', kinds: ['post_office'] },
  { id: 'museum', group: 'sights', label: 'Museum or gallery', icon: 'library', kinds: ['museum', 'gallery', 'library'] },
  { id: 'beach', group: 'sights', label: 'Beach', icon: 'umbrella', kinds: ['beach', 'beach_resort', 'island'] },
  { id: 'viewpoint', group: 'sights', label: 'Viewpoint', icon: 'eye', kinds: ['viewpoint', 'peak'] },
  { id: 'park', group: 'sights', label: 'Park or nature spot', icon: 'leaf', kinds: ['park', 'national_park', 'nature_reserve', 'picnic_site', 'garden', 'waterfall'] },
  { id: 'worship', group: 'sights', label: 'Place of worship', icon: 'home', kinds: ['place_of_worship', 'monastery'] },
  { id: 'attraction', group: 'sights', label: 'Place to visit', icon: 'camera', kinds: ['attraction', 'artwork', 'memorial', 'monument', 'landmark', 'zoo', 'theme_park', 'water_park', 'historic'] },
];

export const NAVIGATION_PLACE_FILTERS = [
  { id: 'all', label: 'All places', icon: 'apps' },
  { id: 'food', label: 'Food & cafés', icon: 'restaurant' },
  { id: 'stay', label: 'Stays', icon: 'bed' },
  { id: 'transport', label: 'Transport', icon: 'bus' },
  { id: 'health', label: 'Health', icon: 'medkit' },
  { id: 'safety', label: 'Safety', icon: 'shield-checkmark' },
  { id: 'money', label: 'Money', icon: 'cash' },
  { id: 'toilets', label: 'Toilets', icon: 'man' },
  { id: 'water', label: 'Water', icon: 'water' },
  { id: 'shops', label: 'Shops', icon: 'storefront' },
  { id: 'sights', label: 'Sights', icon: 'camera' },
  { id: 'help', label: 'Visitor help', icon: 'information-circle' },
];

const fallbackType = { id: 'place', label: 'Place', icon: 'location' };
export const navigationPlaceType = kind => NAVIGATION_PLACE_TYPES.find(type => type.kinds.includes(kind)) ?? fallbackType;

export const navigationPlaceFilter = category => [
  'match', ['get', 'kind'],
  NAVIGATION_PLACE_TYPES.filter(type => category === 'all' || type.group === category).flatMap(type => type.kinds)
    .concat(category === 'all' ? ['place'] : []),
  true, false,
];

export const NAVIGATION_PLACE_ICON = [
  'match', ['get', 'kind'],
  ...NAVIGATION_PLACE_TYPES.flatMap(type => [type.kinds, `poi-${type.id}`]),
  'poi-place',
];

export const navigationPlaceDetails = feature => {
  const properties = feature?.properties ?? {};
  const type = navigationPlaceType(properties.kind);
  const label = { peak: 'Mountain', marina: 'Marina', island: 'Island', library: 'Library' }[properties.kind] ?? type.label;
  const name = properties.name || properties['name:en'];
  return { name: typeof name === 'string' && name.trim() ? name.trim() : label, label, icon: type.icon, imageId: `poi-${type.id}` };
};

export const navigationPlacesData = places => ({
  type: 'FeatureCollection',
  features: places.filter(place => Number.isFinite(place.lng) && Number.isFinite(place.lat))
    .map(place => ({
      type: 'Feature', id: place.id,
      properties: {
        name: place.name,
        kind: navigationPlaceType(place.category).id === 'place' ? 'place' : place.category,
      },
      geometry: { type: 'Point', coordinates: [place.lng, place.lat] },
    })),
});
