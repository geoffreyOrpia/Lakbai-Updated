import {
  getDataRevision,
  markDataChanged,
  subscribeDataChanges,
} from '../src/core/state/dataInvalidation.jsx';

describe('data invalidation revisions', () => {
  test('only advances revisions for the domains that changed', () => {
    const libraryBefore = getDataRevision(['library']);
    const tripsBefore = getDataRevision(['trips']);

    markDataChanged('library');

    expect(getDataRevision(['library'])).toBeGreaterThan(libraryBefore);
    expect(getDataRevision(['trips'])).toBe(tripsBefore);
  });

  test('notifies subscribers when relevant application data changes', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeDataChanges(listener);

    markDataChanged('favorites');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    markDataChanged('favorites');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
