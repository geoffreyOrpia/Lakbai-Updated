import { ExploreViewModel } from '../src/presentation/viewmodels/ExploreViewModel.jsx';

const place = (id, overrides = {}) => ({
  id,
  placeId: id.split(':').at(-1),
  destinationId: id.split(':')[0],
  destinationName: 'Destination Pack',
  municipality: 'Tagum',
  name: id,
  category: 'park',
  description: 'Local place',
  tip: '',
  target: { label: id, lat: 7.44, lng: 125.8 },
  region: 'mainland',
  interests: ['nature'],
  planningDifficulty: 'easy',
  sourceReview: {
    eligible: true,
    level: 'official-reference',
    label: 'Official source reviewed',
    reviewedAt: '2026-09-28',
  },
  saved: true,
  offlineNavigationAvailable: true,
  ...overrides,
});

const createVm = ({ locationService = null } = {}) => {
  const nav = {
    onPlanTrip: jest.fn(),
    onOpenDestination: jest.fn(),
  };
  const vm = new ExploreViewModel({}, {}, {}, locationService, nav);
  vm.setState({
    smartCatalog: [
      place('tagum:a'),
      place('tagum:b', { target: { label: 'B', lat: 7.45, lng: 125.81 } }),
      place('tagum:c'),
      place('tagum:d'),
      place('tagum:e'),
    ],
  });
  return { vm, nav };
};

describe('ExploreViewModel Smart Explore behavior', () => {
  test('limits smart trip selection to four places', () => {
    const { vm } = createVm();

    for (const id of ['tagum:a', 'tagum:b', 'tagum:c', 'tagum:d']) {
      expect(vm.toggleSmartSelection(id).ok).toBe(true);
    }
    const fifth = vm.toggleSmartSelection('tagum:e');

    expect(fifth).toEqual({
      ok: false,
      message: 'Smart trips support up to 4 selected stops.',
    });
    expect(vm.state.smartSelectedIds).toHaveLength(4);
  });

  test('changing recommendation preferences clears stale trip selections', () => {
    const { vm } = createVm();
    vm.toggleSmartSelection('tagum:a');
    vm.toggleSmartSelection('tagum:b');

    vm.toggleSmartInterest('nature');

    expect(vm.state.smartPreferences.interests).toEqual(['nature']);
    expect(vm.state.smartSelectedIds).toEqual([]);
  });

  test('builds a smart trip through navigation only after two places are selected', () => {
    const { vm, nav } = createVm();

    vm.toggleSmartSelection('tagum:a');
    expect(vm.buildSmartTrip()).toBe(false);
    expect(nav.onPlanTrip).not.toHaveBeenCalled();

    vm.toggleSmartSelection('tagum:b');
    expect(vm.buildSmartTrip()).toBe(true);
    expect(nav.onPlanTrip).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'smart-explore',
      travelMode: 'drive',
      stops: expect.arrayContaining([
        expect.objectContaining({ destinationId: 'tagum', target: expect.any(Object) }),
      ]),
    }));
  });

  test('keeps recommendations usable when location permission is denied', async () => {
    const locationService = {
      requestPermissions: jest.fn().mockResolvedValue(false),
      getCurrentFix: jest.fn(),
    };
    const { vm } = createVm({ locationService });

    expect(await vm.useCurrentLocation()).toBe(false);

    expect(vm.state.smartLocationStatus).toBe('denied');
    expect(vm.state.smartFix).toBeNull();
    expect(vm.smartResults.length).toBeGreaterThan(0);
    expect(locationService.getCurrentFix).not.toHaveBeenCalled();
  });
});
