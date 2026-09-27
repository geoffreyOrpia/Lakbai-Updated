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
    expect(places.map(place => place.spot.id)).toEqual(['near', 'far']);
    expect(places[0].distanceKm).toBeLessThan(places[1].distanceKm);
  });

  test('loads only packs represented by local Library metadata', async () => {
    const packRepository = {
      listSavedMeta: jest.fn().mockResolvedValue([{ packId: 'samal' }]),
      getSavedPack: jest.fn().mockResolvedValue(samal),
    };

    const places = await loadNearbySavedPlaces({ packRepository }, { lat: 7, lng: 125 });

    expect(packRepository.getSavedPack).toHaveBeenCalledTimes(1);
    expect(packRepository.getSavedPack).toHaveBeenCalledWith('samal');
    expect(places).toHaveLength(2);
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
