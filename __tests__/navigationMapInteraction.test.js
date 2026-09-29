import React from 'react';
import { act, create } from 'react-test-renderer';
import { Modal } from 'react-native';
import { NavigationMap } from '../src/presentation/views/components/NavigationMap.jsx';
import { NavigationScreen } from '../src/presentation/views/screens/NavigationScreen.jsx';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@maplibre/maplibre-react-native', () => ({
  Map: 'NativeMap', Camera: 'Camera', GeoJSONSource: 'Source', Images: 'Images', Layer: 'Layer', Marker: 'Marker',
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

const props = {
  route: { geometry: { type: 'LineString', coordinates: [[125.6, 7.3], [125.7, 7.4]] } },
  target: { lng: 125.7, lat: 7.4 },
  offlineBasemapUri: 'file:///saved-map.pmtiles',
  mode: 'walk',
  currentPosition: { lng: 125.61, lat: 7.31 },
};

describe('navigation map interactions', () => {
  let tree;
  afterEach(() => { if (tree) act(() => tree.unmount()); });

  test('opens from a map tap, keeps only one native map, and closes with device back', () => {
    act(() => { tree = create(<NavigationMap {...props} />); });
    expect(tree.root.findByType('NativeMap').props.touchZoom).toBe(true);
    act(() => tree.root.findByType('NativeMap').props.onPress());
    expect(tree.root.findAllByType('NativeMap')).toHaveLength(1);
    expect(tree.root.findByType(Modal).props.visible).toBe(true);
    expect(tree.root.findByType('NativeMap').props.onPress).toBeUndefined();
    act(() => tree.root.findByType(Modal).props.onRequestClose());
    expect(tree.root.findByType(Modal).props.visible).toBe(false);
    expect(tree.root.findAllByType('NativeMap')).toHaveLength(1);
  });

  test('starts following when guidance starts, and keeps mute and stop available full screen', () => {
    const onStop = jest.fn();
    const onToggleVoice = jest.fn();
    act(() => { tree = create(<NavigationMap {...props} onStop={onStop} onToggleVoice={onToggleVoice} />); });
    expect(tree.root.findByType('Camera').props.trackUserLocation).toBeUndefined();
    act(() => tree.update(<NavigationMap {...props} liveGps onStop={onStop} onToggleVoice={onToggleVoice} />));
    expect(tree.root.findByType('Camera').props.trackUserLocation).toBe('course');
    expect(tree.root.findAllByType('Marker')).toHaveLength(2);
    expect(tree.root.findAllByType('Icon').some(node => node.props.name === 'walk')).toBe(true);
    expect(tree.root.findAllByType('Layer').some(node => node.props.id === 'lakbai-tourism-poi-icons')).toBe(true);
    act(() => tree.root.findByType('NativeMap').props.onPress());
    act(() => tree.root.findAll(node => node.props.accessibilityLabel === 'Mute directions' && typeof node.props.onPress === 'function')[0].props.onPress());
    act(() => tree.root.findAll(node => node.props.accessibilityLabel === 'Stop directions' && typeof node.props.onPress === 'function')[0].props.onPress());
    expect(onToggleVoice).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);
    act(() => tree.root.findAll(node => node.props.accessibilityLabel === 'Close full-screen map' && typeof node.props.onPress === 'function')[0].props.onPress());
    expect(tree.root.findByType(Modal).props.visible).toBe(false);
  });

  test('a sample route offers current-location directions while optional details stay collapsed', () => {
    const startFromGps = jest.fn();
    const viewModel = {
      state: {
        ...props, loading: false, preview: true, mode: 'walk', destinationName: 'Market',
        multiStops: [], routePois: [], alternativeRoutes: [], progressPct: 0,
        route: { ...props.route, distanceKm: 2, durationMin: 25, maneuvers: [] },
      },
      startFromGps,
    };
    act(() => { tree = create(<NavigationScreen viewModel={viewModel} />); });
    const useLocation = tree.root.findAll(node => node.props.label === 'Use my location')[0];
    act(() => useLocation.props.onPress());
    expect(startFromGps).toHaveBeenCalledTimes(1);
    expect(tree.root.findAll(node => node.props.label === 'Find alternatives')).toHaveLength(0);
    expect(tree.root.findAllByType('NativeMap')).toHaveLength(1);
  });
});
