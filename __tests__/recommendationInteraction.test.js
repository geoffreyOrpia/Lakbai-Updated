import React from 'react';
import { act, create } from 'react-test-renderer';
import { SmartExplorePanel } from '../src/presentation/views/components/SmartExplorePanel.jsx';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../src/feedback/FeedbackProvider.jsx', () => ({ useFeedback: () => ({ showSnackbar: jest.fn() }) }));
global.IS_REACT_ACT_ENVIRONMENT = true;

test('the card opens its guide and only the separate trip button changes selection', () => {
  const place = { id: 'beach', name: 'Beach', municipality: 'Samal', category: 'Beach', description: 'By the water', sourceReview: { label: 'Checked sources' }, reasons: [] };
  const viewModel = {
    state: { smartOpen: true, smartSelectedIds: [], smartPreferences: { interests: [], walking: 'any', travelMode: 'drive', ferry: 'allow' } },
    smartResults: [place],
    openSmartDestination: jest.fn(),
    toggleSmartSelection: jest.fn().mockReturnValue({ ok: true }),
  };
  let tree;
  try {
    act(() => { tree = create(<SmartExplorePanel viewModel={viewModel} />); });
    const card = tree.root.findAll(node => node.props.accessibilityLabel === 'Open Beach guide' && typeof node.props.onPress === 'function')[0];
    expect(card.findAllByType('Icon').some(icon => icon.props.name === 'chevron-forward')).toBe(true);
    expect(card.findAllByType('Icon').some(icon => icon.props.name === 'add-circle-outline')).toBe(false);
    act(() => card.props.onPress());
    expect(viewModel.openSmartDestination).toHaveBeenCalledWith(place);
    expect(viewModel.toggleSmartSelection).not.toHaveBeenCalled();
    act(() => tree.root.findAll(node => node.props.label === 'Add to trip')[0].props.onPress());
    expect(viewModel.toggleSmartSelection).toHaveBeenCalledWith('beach');
  } finally {
    if (tree) act(() => tree.unmount());
  }
});
