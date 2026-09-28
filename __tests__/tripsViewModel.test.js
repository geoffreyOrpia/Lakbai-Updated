import { routeDraftToTripForm, TripsViewModel } from '../src/presentation/viewmodels/TripsViewModel.jsx';

const existingTrip = {
  id: 'trip-existing',
  ownerKey: 'local-device',
  title: 'Samal Day',
  travelDate: '2026-10-05',
  notes: 'Original note',
  stops: [{
    destinationId: 'samal',
    destinationName: 'Samal Island',
    municipality: 'Samal',
    plannedTime: '8:00 AM',
    note: 'Ferry first',
  }],
  createdAt: 1000,
  updatedAt: 2000,
};

const createViewModel = () => {
  const itineraryRepository = {
    listItineraries: jest.fn().mockResolvedValue([existingTrip]),
    saveItinerary: jest.fn().mockResolvedValue(undefined),
    deleteItinerary: jest.fn().mockResolvedValue(undefined),
  };
  const packRepository = {
    listSavedMeta: jest.fn().mockResolvedValue([]),
  };
  const destinationRepository = {
    getDestinations: jest.fn().mockResolvedValue({ items: [], source: 'library' }),
  };
  const nav = {
    onOpenDestination: jest.fn(),
    onOpenNavigation: jest.fn(),
  };
  const viewModel = new TripsViewModel(
    { itineraryRepository },
    { packRepository, destinationRepository },
    nav,
  );
  return { viewModel, itineraryRepository, nav };
};

describe('TripsViewModel itinerary editing', () => {
  test('converts a suggested route into an editable planning-only trip draft', () => {
    const form = routeDraftToTripForm({
      destinationId: 'tagum',
      destinationName: 'Tagum City',
      municipality: 'Tagum',
      routeName: 'Heritage Walk',
      stops: [{ name: 'Cathedral' }, { name: 'City Hall' }],
    });

    expect(form.title).toBe('Tagum City: Heritage Walk');
    expect(form.travelDate).toBe('');
    expect(form.notes).toContain('Planning only');
    expect(form.notes).toContain('Cathedral → City Hall');
    expect(form.stops).toEqual([
      expect.objectContaining({
        destinationId: 'tagum',
        note: expect.stringContaining('Cathedral → City Hall'),
      }),
    ]);
  });
  test('converts Smart Explore output into exact POI stops and preserves driving mode', () => {
    const form = routeDraftToTripForm({
      kind: 'smart-explore',
      title: 'Smart Tagum trip',
      travelMode: 'drive',
      notes: 'Generated offline.',
      stops: [{
        destinationId: 'tagum',
        destinationName: 'Christ the King Cathedral',
        municipality: 'Tagum',
        placeId: 'spot-tag-cathedral',
        target: {
          label: 'Christ the King Cathedral',
          lat: 7.4477,
          lng: 125.8071,
        },
        note: 'Matches culture',
      }, {
        destinationId: 'tagum',
        destinationName: 'Museyo Sukwahi',
        municipality: 'Tagum',
        placeId: 'spot-tag-museum',
        target: {
          label: 'Museyo Sukwahi',
          lat: 7.4489,
          lng: 125.8045,
        },
        note: 'Matches culture',
      }],
    });

    expect(form.navigationMode).toBe('drive');
    expect(form.stops).toHaveLength(2);
    expect(form.stops[0]).toEqual(expect.objectContaining({
      destinationId: 'tagum',
      placeId: 'spot-tag-cathedral',
      target: {
        label: 'Christ the King Cathedral',
        lat: 7.4477,
        lng: 125.8071,
      },
    }));
  });

  test('loads an existing itinerary into the shared editor', () => {
    const { viewModel } = createViewModel();

    viewModel.openEdit(existingTrip);

    expect(viewModel.state.mode).toBe('edit');
    expect(viewModel.state.selected).toBe(existingTrip);
    expect(viewModel.state.form).toEqual({
      title: existingTrip.title,
      travelDate: existingTrip.travelDate,
      notes: existingTrip.notes,
      navigationMode: 'walk',
      stops: existingTrip.stops,
    });
    expect(viewModel.state.form.stops).not.toBe(existingTrip.stops);
  });

  test('updates an itinerary without changing its identity or creation time', async () => {
    const { viewModel, itineraryRepository } = createViewModel();
    viewModel.openEdit(existingTrip);
    viewModel.setFormField({
      title: 'Updated Samal Day',
      notes: 'Updated note',
    });

    const saved = await viewModel.save();

    expect(saved).toBe(true);
    expect(itineraryRepository.saveItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingTrip.id,
        ownerKey: existingTrip.ownerKey,
        title: 'Updated Samal Day',
        notes: 'Updated note',
        createdAt: existingTrip.createdAt,
      }),
    );
    expect(viewModel.state.mode).toBe('list');
    expect(viewModel.state.selected).toBeNull();
  });

  test('canceling edit returns to the selected trip details', () => {
    const { viewModel } = createViewModel();
    viewModel.openEdit(existingTrip);

    viewModel.cancelCreate();

    expect(viewModel.state.mode).toBe('details');
    expect(viewModel.state.selected).toBe(existingTrip);
  });

  test('reports the exact stops missing from the local Library', () => {
    const { viewModel } = createViewModel();
    viewModel.setState({
      savedPackIds: ['samal'],
    });
    const trip = {
      ...existingTrip,
      stops: [
        existingTrip.stops[0],
        {
          destinationId: 'tagum',
          destinationName: 'Tagum City',
          municipality: 'Tagum',
          plannedTime: '',
          note: '',
        },
      ],
    };

    expect(viewModel.tripReadiness(trip)).toEqual({
      ready: 1,
      total: 2,
      percent: 50,
      missingStops: [trip.stops[1]],
    });
  });

  test('navigates a smart trip to its exact POI targets and restores persisted driving mode', () => {
    const { viewModel, nav } = createViewModel();
    viewModel.setState({
      destinations: [{
        destination: {
          id: 'tagum',
          name: 'Tagum City',
          municipality: 'Tagum',
          offlineNavigation: {
            target: { label: 'Default Tagum target', lat: 7.4477, lng: 125.8071 },
          },
        },
      }],
    });
    const smartTrip = {
      id: 'trip-smart',
      title: 'Smart Tagum trip',
      stops: [{
        destinationId: 'tagum',
        destinationName: 'Museyo Sukwahi',
        municipality: 'Tagum',
        placeId: 'spot-tag-museum',
        navigationMode: 'drive',
        target: {
          label: 'Museyo Sukwahi',
          lat: 7.4489,
          lng: 125.8045,
        },
      }],
    };

    expect(viewModel.navigateTrip(smartTrip)).toBe(true);
    expect(nav.onOpenNavigation).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'drive',
      multiStops: [expect.objectContaining({
        placeId: 'spot-tag-museum',
        name: 'Museyo Sukwahi',
        target: {
          label: 'Museyo Sukwahi',
          lat: 7.4489,
          lng: 125.8045,
        },
      })],
    }));
  });

  test('persists navigation mode inside stop JSON for restart-safe smart trips', async () => {
    const { viewModel, itineraryRepository } = createViewModel();
    viewModel.setState({
      mode: 'create',
      form: {
        title: 'Driving day',
        travelDate: '2026-10-05',
        notes: '',
        navigationMode: 'drive',
        stops: [{
          destinationId: 'tagum',
          destinationName: 'Museyo Sukwahi',
          municipality: 'Tagum',
          plannedTime: '',
          note: '',
          placeId: 'spot-tag-museum',
          target: { label: 'Museyo Sukwahi', lat: 7.4489, lng: 125.8045 },
        }],
      },
    });

    expect(await viewModel.save()).toBe(true);
    expect(itineraryRepository.saveItinerary).toHaveBeenCalledWith(expect.objectContaining({
      navigationMode: 'drive',
      stops: [expect.objectContaining({ navigationMode: 'drive' })],
    }));
  });

  test('opens a missing destination through navigation', () => {
    const { viewModel, nav } = createViewModel();

    viewModel.openDestination('tagum');

    expect(nav.onOpenDestination).toHaveBeenCalledWith('tagum');
  });
});
