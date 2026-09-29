import React from 'react';
import { act, create } from 'react-test-renderer';
import { TripsScreen } from '../src/presentation/views/screens/TripsScreen.jsx';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../src/feedback/FeedbackProvider.jsx', () => ({
  useFeedback: () => ({
    showSnackbar: jest.fn(),
    showConfirm: jest.fn(),
  }),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

test('renders multiple POI stops from the same destination with unique React keys', () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  const viewModel = {
    state: {
      mode: 'create',
      form: {
        title: 'Samal day',
        travelDate: '',
        notes: '',
        navigationMode: 'drive',
        stops: [{
          destinationId: 'samal',
          destinationName: 'Kaputian Beach Park',
          municipality: 'Samal',
          placeId: 'spot-samal-kaputian',
          plannedTime: '',
          note: '',
        }, {
          destinationId: 'samal',
          destinationName: 'Port of Babak',
          municipality: 'Samal',
          placeId: 'spot-samal-ferry',
          plannedTime: '',
          note: '',
        }],
      },
      destinations: [],
      busy: false,
      error: null,
    },
    save: jest.fn(),
    cancelCreate: jest.fn(),
    setFormField: jest.fn(),
    addStop: jest.fn(),
    isStopAdded: jest.fn(),
    moveStop: jest.fn(),
    updateStop: jest.fn(),
    removeStop: jest.fn(),
  };

  let tree;
  try {
    act(() => {
      tree = create(<TripsScreen viewModel={viewModel} />);
    });

    const duplicateKeyWarnings = consoleError.mock.calls
      .map(call => call.join(' '))
      .filter(message => message.includes('same key'));

    expect(duplicateKeyWarnings).toEqual([]);
  } finally {
    if (tree) act(() => tree.unmount());
    consoleError.mockRestore();
  }
});
