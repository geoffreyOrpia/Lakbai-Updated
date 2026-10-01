import React from 'react';
import { act, create } from 'react-test-renderer';
import { SafetyScreen } from '../src/presentation/views/screens/SafetyScreen.jsx';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../src/feedback/FeedbackProvider.jsx', () => ({
  useFeedback: () => ({ showSnackbar: jest.fn() }),
}));
jest.mock('../src/presentation/views/components/ScreenScrollView.jsx', () => ({
  ScreenScrollView: 'ScreenScrollView',
}));
jest.mock('../src/presentation/views/components/AppHeader.jsx', () => ({
  AppHeader: 'AppHeader',
}));
jest.mock('../src/presentation/views/components/InfoBanner.jsx', () => ({
  InfoBanner: 'InfoBanner',
}));
jest.mock('../src/presentation/views/components/SectionHeader.jsx', () => ({
  SectionHeader: 'SectionHeader',
}));
jest.mock('../src/presentation/views/components/ScreenIntro.jsx', () => ({
  ScreenIntro: 'ScreenIntro',
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('SafetyScreen substance', () => {
  test('shows emergency action and destination-specific safety without generic filler', () => {
    const viewModel = {
      state: {
        destinations: [{
          destinationId: 'hagimit-falls',
          name: 'Hagimit Falls',
          area: 'Samal Island',
          reminders: [
            'Avoid entering the water when conditions are unsafe.',
            'Keep children closely supervised around moving water.',
          ],
        }],
        loading: false,
        error: null,
      },
      call911: jest.fn().mockResolvedValue({ ok: true }),
    };

    let tree;
    act(() => {
      tree = create(<SafetyScreen
        viewModel={viewModel}
        onOpenSettings={jest.fn()}
        onOpenDestination={jest.fn()}
      />);
    });

    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered).toContain('Dial 911');
    expect(rendered).toContain('Safety notes');
    expect(rendered).toContain('Hagimit Falls');
    expect(rendered).toContain('Avoid entering the water when conditions are unsafe.');
    expect(rendered).not.toContain('Before leaving');
    expect(rendered).not.toContain('Emergency contacts from your guides');
    expect(rendered).not.toContain('No guide contacts yet');
    expect(rendered).not.toContain('0/6 ready');
  });
});
