import { ExploreViewModel } from '../src/presentation/viewmodels/ExploreViewModel.jsx';

const createVm = () => ({
  vm: new ExploreViewModel({}, {}),
});

describe('ExploreViewModel catalog behavior', () => {

  test('paginates the main Explore catalog and resets the page when filters change', () => {
    const { vm } = createVm();
    vm.setState({
      items: Array.from({ length: 19 }, (_, index) => ({
        destination: {
          id: `destination-${index}`,
          name: `Place ${index}`,
          area: 'Davao del Norte',
          municipality: 'Tagum',
          summary: 'Tourism place',
          category: 'nature',
        },
      })),
    });

    expect(vm.results).toHaveLength(19);
    expect(vm.visibleResults).toHaveLength(8);
    expect(vm.hasMoreResults).toBe(true);
    vm.loadMoreResults();
    expect(vm.visibleResults).toHaveLength(16);
    vm.setCategory('nature');
    expect(vm.visibleResults).toHaveLength(8);
  });
});
