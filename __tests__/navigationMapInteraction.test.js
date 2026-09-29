import React from 'react';
import { act, create } from 'react-test-renderer';
import { Modal } from 'react-native';
import { NavigationMap } from '../src/presentation/views/components/NavigationMap.jsx';
import { NavigationScreen } from '../src/presentation/views/screens/NavigationScreen.jsx';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@maplibre/maplibre-react-native', () => ({
  Map: 'NativeMap', Camera: 'Camera', GeoJSONSource: 'Source', Images: 'Images', Layer: 'Layer',
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
    expect(tree.root.findByType('NativeMap').props.onPress).toEqual(expect.any(Function));
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
    expect(tree.root.findAllByType('Marker')).toHaveLength(0);
    act(() => tree.root.findByType('NativeMap').props.onDidFinishLoadingMap());
    const tourismPoiLayer = tree.root.findAllByType('Layer').find(
      node => node.props.id === 'lakbai-tourism-poi-icons',
    );
    expect(tourismPoiLayer).toBeTruthy();
    expect(tourismPoiLayer.props.layout).not.toHaveProperty('icon-padding');
    expect(tree.root.findAllByType('Layer').some(node => (
      node.props.id === 'lakbai-navigation-user-symbol'
      && node.props.layout?.['icon-image'] === 'nav-walk'
    ))).toBe(true);
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

  const press = label => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0].props.onPress();
  const layer = id => tree.root.findAllByType('Layer').find(node => node.props.id === id);

  test('category filters affect map and guide places, survive expansion, and remove the old unfiltered dots', () => {
    const places = Array.from({ length: 6 }, (_, id) => ({ id, name: `Stop ${id}`, category: 'market', lng: 125.6 + id / 100, lat: 7.3 }));
    act(() => { tree = create(<NavigationMap {...props} places={places} routePois={places.slice(0, 3)} />); });
    act(() => tree.root.findByType('NativeMap').props.onDidFinishLoadingMap());
    expect(tree.root.findAllByType('Source').find(node => node.props.id === 'lakbai-guide-places').props.data.features).toHaveLength(6);
    expect(tree.root.findByType('NativeMap').props.mapStyle.layers.some(item => item.id.startsWith('offline-pois-'))).toBe(false);
    act(() => press('Choose places to show'));
    act(() => press('Show toilets'));
    expect(layer('lakbai-tourism-poi-icons').props.filter[2]).toEqual(['toilets']);
    expect(layer('lakbai-guide-place-icons').props.filter).toEqual(layer('lakbai-tourism-poi-icons').props.filter);
    act(() => press('Expand map'));
    act(() => tree.root.findByType('NativeMap').props.onDidFinishLoadingMap());
    expect(layer('lakbai-tourism-poi-icons').props.filter[2]).toEqual(['toilets']);
    act(() => press('Choose places to show'));
    act(() => press('Show all places'));
    expect(layer('lakbai-tourism-poi-icons').props.filter[2]).toContain('ferry_terminal');
    expect(layer('lakbai-tourism-poi-icons').props.layout['icon-allow-overlap']).toBe(false);
  });

  test('tapping a symbol opens a name and category; empty taps and close clear it', async () => {
    const queryRenderedFeatures = jest.fn().mockResolvedValue([{ properties: { name: 'Town Pharmacy', kind: 'pharmacy' } }]);
    act(() => { tree = create(<NavigationMap {...props} />, { createNodeMock: node => node.type === 'NativeMap' ? { queryRenderedFeatures } : null }); });
    act(() => press('Expand map'));
    act(() => tree.root.findByType('NativeMap').props.onDidFinishLoadingMap());
    await act(async () => tree.root.findByType('NativeMap').props.onPress({ nativeEvent: { point: [100, 200] } }));
    expect(queryRenderedFeatures).toHaveBeenCalledWith([78, 178, 122, 222], { layers: ['lakbai-tourism-poi-icons', 'lakbai-guide-place-icons'] });
    expect(JSON.stringify(tree.toJSON())).toContain('Town Pharmacy');
    expect(JSON.stringify(tree.toJSON())).toContain('Pharmacy');
    act(() => press('Close place details'));
    expect(JSON.stringify(tree.toJSON())).not.toContain('Town Pharmacy');
    queryRenderedFeatures.mockResolvedValueOnce([{ properties: { kind: 'toilets' } }]);
    await act(async () => tree.root.findByType('NativeMap').props.onPress({ nativeEvent: { point: [100, 200] } }));
    expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Close place details').length).toBeGreaterThan(0);
    queryRenderedFeatures.mockResolvedValueOnce([]);
    await act(async () => tree.root.findByType('NativeMap').props.onPress({ nativeEvent: { point: [100, 200] } }));
    expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Close place details')).toHaveLength(0);
  });

  test('fallback keeps guide symbols and the destination visible without querying a missing basemap layer', async () => {
    const queryRenderedFeatures = jest.fn().mockRejectedValue(new Error('Native map unavailable'));
    act(() => { tree = create(<NavigationMap {...props} offlineBasemapUri={null} />, { createNodeMock: node => node.type === 'NativeMap' ? { queryRenderedFeatures } : null }); });
    act(() => press('Expand map'));
    act(() => tree.root.findByType('NativeMap').props.onDidFinishLoadingMap());
    expect(tree.root.findByType('Images').props.images['nav-destination']).toBeTruthy();
    expect(layer('lakbai-tourism-poi-icons')).toBeUndefined();
    await act(async () => tree.root.findByType('NativeMap').props.onPress({ nativeEvent: { point: [100, 200] } }));
    expect(queryRenderedFeatures.mock.calls[0][1].layers).toEqual(['lakbai-guide-place-icons']);
    expect(JSON.stringify(tree.toJSON())).toContain('Try tapping again.');
  });
});
