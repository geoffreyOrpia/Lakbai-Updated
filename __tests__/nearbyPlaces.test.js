import { loadNearbySavedPlaces, rankNearbyPlaces } from '../src/domain/usecases/nearbyPlaces.jsx';

const samal = {
  id: 'samal',
  destination: {
    name: 'Samal Island',
    municipality: 'Samal',
  },
  spots: [
    {
      id: 'near',
      name: 'Near Beach',
      category: 'attraction',
      lat: 7,
      lng: 125.01,
      description: 'Nearby',
    },
    {
      id: 'far',
      name: 'Far Beach',
      category: 'attraction',
      lat: 7,
      lng: 125.1,
      description: 'Farther away',
    },
  ],
};

describe('Nearby Places', () => {
  test('ranks saved pack places by offline GPS distance', () => {
    const places = rankNearbyPlaces([samal], { lat: 7, lng: 125 });
    expect(places.map(place => place.spot.id)).toEqual(expect.arrayContaining(['destination-area', 'near', 'far']));
    expect(places.find(place => place.spot.id === 'near').distanceKm)
      .toBeLessThan(places.find(place => place.spot.id === 'far').distanceKm);
    expect(places.find(place => place.kind === 'destination')).toEqual(expect.objectContaining({
      destinationId: 'samal',
      category: 'destination',
    }));
  });

  test('loads only packs represented by local Library metadata', async () => {
    const packRepository = {
      listSavedMeta: jest.fn().mockResolvedValue([{ packId: 'samal' }]),
      getBundledPack: jest.fn().mockResolvedValue(samal),
    };

    const places = await loadNearbySavedPlaces({ packRepository }, { lat: 7, lng: 125 });

    expect(packRepository.getBundledPack).toHaveBeenCalledTimes(1);
    expect(packRepository.getBundledPack).toHaveBeenCalledWith('samal');
    expect(places).toHaveLength(3);
    expect(places.some(place => place.kind === 'destination')).toBe(true);
  });

  test('ignores places without coordinates', () => {
    const places = rankNearbyPlaces([
      {
        ...samal,
        spots: [...samal.spots, { id: 'missing', name: 'Missing coordinate' }],
      },
    ], { lat: 7, lng: 125 });

    expect(places.some(place => place.spot.id === 'missing')).toBe(false);
  });
});
