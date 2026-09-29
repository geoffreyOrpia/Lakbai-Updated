import React from 'react';
import { act, create } from 'react-test-renderer';
import { ScreenActiveContext, ScreenScrollView } from '../src/presentation/views/components/ScreenScrollView.jsx';

const mockScrollTo = jest.fn();
jest.mock('react-native', () => {
  const React = require('react');
  return { ScrollView: React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
    return React.createElement('ScrollSurface', props);
  }) };
});
global.IS_REACT_ACT_ENVIRONMENT = true;

test('restores the previous reading position and ignores scroll resets while hidden', () => {
  const frames = new Map();
  let id = 0;
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++id, callback); return id; });
  jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(key => frames.delete(key));
  const flush = () => act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); });
  const screen = active => <ScreenActiveContext.Provider value={active}><ScreenScrollView /></ScreenActiveContext.Provider>;
  let tree;
  try {
    act(() => { tree = create(screen(true)); });
    flush();
    act(() => tree.root.findByType('ScrollSurface').props.onScroll({ nativeEvent: { contentOffset: { x: 0, y: 540 } } }));
    act(() => tree.update(screen(false)));
    act(() => tree.root.findByType('ScrollSurface').props.onScroll({ nativeEvent: { contentOffset: { x: 0, y: 0 } } }));
    act(() => tree.update(screen(true)));
    act(() => tree.root.findByType('ScrollSurface').props.onLayout({}));
    flush();
    expect(mockScrollTo).toHaveBeenLastCalledWith({ x: 0, y: 540, animated: false });
  } finally {
    if (tree) act(() => tree.unmount());
    jest.restoreAllMocks();
  }
});
