import { TripsViewModel } from '../src/presentation/viewmodels/TripsViewModel.jsx';

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
    listDownloadedMeta: jest.fn().mockResolvedValue([]),
  };
  const destinationRepository = {
    getDestinations: jest.fn().mockResolvedValue({ items: [], source: 'local' }),
  };
  const nav = {
    onOpenDestination: jest.fn(),
  };
  const viewModel = new TripsViewModel(
    { itineraryRepository },
    { packRepository, destinationRepository },
    nav,
  );
  return { viewModel, itineraryRepository, nav };
};

describe('TripsViewModel itinerary editing', () => {
  test('loads an existing itinerary into the shared editor', () => {
    const { viewModel } = createViewModel();

    viewModel.openEdit(existingTrip);

    expect(viewModel.state.mode).toBe('edit');
    expect(viewModel.state.selected).toBe(existingTrip);
    expect(viewModel.state.form).toEqual({
      title: existingTrip.title,
      travelDate: existingTrip.travelDate,
      notes: existingTrip.notes,
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
      downloadedIds: ['samal'],
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

  test('opens a missing destination through navigation', () => {
    const { viewModel, nav } = createViewModel();

    viewModel.openDestination('tagum');

    expect(nav.onOpenDestination).toHaveBeenCalledWith('tagum');
  });
});
