import { navigationPlaceType, navigationPlaceFilter, navigationPlaceDetails, navigationPlacesData, NAVIGATION_PLACE_TYPES } from '../src/core/maps/navigationPlaces.jsx';

test('tourist essentials have distinct symbols and newly supported kinds are included', () => {
  const essentials = ['toilets', 'drinking_water', 'atm', 'information', 'pharmacy', 'hospital', 'ferry_terminal'];
  expect(new Set(essentials.map(kind => navigationPlaceType(kind).id)).size).toBe(essentials.length);
  const kinds = NAVIGATION_PLACE_TYPES.flatMap(type => type.kinds);
  expect(new Set(kinds).size).toBe(kinds.length);
  expect(navigationPlaceFilter('all')[2]).toEqual(expect.arrayContaining([
    ...essentials, 'bank', 'marketplace', 'supermarket', 'mall', 'bus_station', 'aerodrome', 'beach_resort',
  ]));
  expect(navigationPlaceFilter('health')[2]).toContain('pharmacy');
  expect(navigationPlaceFilter('health')[2]).not.toContain('restaurant');
});

test('unnamed places get understandable labels, without mislabelling unknown places as food', () => {
  expect(navigationPlaceDetails({ properties: { kind: 'toilets' } }).name).toBe('Toilets');
  expect(navigationPlaceDetails({ properties: { kind: 'atm', 'name:en': 'Town ATM' } }).name).toBe('Town ATM');
  expect(navigationPlaceDetails({ properties: { kind: 'unknown' } })).toEqual({ name: 'Place', label: 'Place', icon: 'location', imageId: 'poi-place' });
});

test('guide map keeps all valid places even when the along-route list is limited', () => {
  const places = Array.from({ length: 8 }, (_, id) => ({ id, name: `Place ${id}`, category: 'market', lat: 7.4, lng: 125.8 }));
  const data = navigationPlacesData([...places, { id: 'invalid', lat: null, lng: 125.8 }]);
  expect(data.features).toHaveLength(8);
  expect(data.features[0].properties).toEqual({ name: 'Place 0', kind: 'market' });
  expect(navigationPlacesData([{ id: 'other', category: 'facility', lat: 7.4, lng: 125.8 }]).features[0].properties.kind).toBe('place');
});
