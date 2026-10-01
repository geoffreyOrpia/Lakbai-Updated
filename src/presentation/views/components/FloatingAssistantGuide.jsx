import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { layout, shadows } from "../../../theme.jsx";

const guideSource = require('../../../../assets/ask-lakbai-guide.png');
const GUIDE_SIZE = 80;
const EDGE_GAP = 8;
const TOP_GUARD = 84;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const FloatingAssistantGuide = ({
  onPress,
  bottomOffset = layout.tabBarHeight + 20,
  visible = true,
}) => {
  const { width, height } = useWindowDimensions();
  const bounds = useMemo(() => ({
    minX: EDGE_GAP,
    maxX: Math.max(EDGE_GAP, width - GUIDE_SIZE - EDGE_GAP),
    minY: TOP_GUARD,
    maxY: Math.max(TOP_GUARD, height - bottomOffset - GUIDE_SIZE - EDGE_GAP),
  }), [bottomOffset, height, width]);

  const initial = {
    x: bounds.maxX,
    y: bounds.maxY,
  };
  const position = useRef(new Animated.ValueXY(initial)).current;
  const current = useRef(initial);
  const dragStart = useRef(initial);

  useEffect(() => {
    const next = {
      x: clamp(current.current.x, bounds.minX, bounds.maxX),
      y: clamp(current.current.y, bounds.minY, bounds.maxY),
    };
    current.current = next;
    position.setValue(next);
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, position]);

  const finishDrag = useCallback(gesture => {
    const moved = {
      x: clamp(dragStart.current.x + gesture.dx, bounds.minX, bounds.maxX),
      y: clamp(dragStart.current.y + gesture.dy, bounds.minY, bounds.maxY),
    };
    const midpoint = (bounds.minX + bounds.maxX) / 2;
    const snapped = {
      x: moved.x <= midpoint ? bounds.minX : bounds.maxX,
      y: moved.y,
    };
    current.current = snapped;
    Animated.spring(position, {
      toValue: snapped,
      useNativeDriver: false,
      friction: 8,
      tension: 70,
    }).start();
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, position]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => (
      Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4
    ),
    onPanResponderGrant: () => {
      dragStart.current = current.current;
    },
    onPanResponderMove: (_, gesture) => {
      const next = {
        x: clamp(dragStart.current.x + gesture.dx, bounds.minX, bounds.maxX),
        y: clamp(dragStart.current.y + gesture.dy, bounds.minY, bounds.maxY),
      };
      current.current = next;
      position.setValue(next);
    },
    onPanResponderRelease: (_, gesture) => finishDrag(gesture),
    onPanResponderTerminate: (_, gesture) => finishDrag(gesture),
    onPanResponderTerminationRequest: () => false,
  }), [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, finishDrag, position]);

  return <Animated.View
    pointerEvents={visible ? 'auto' : 'none'}
    {...panResponder.panHandlers}
    style={[
      styles.floating,
      {
        opacity: visible ? 1 : 0,
        transform: position.getTranslateTransform(),
      },
    ]}
  >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask LakBai"
        accessibilityHint="Open your local travel guide assistant. Drag to move."
        hitSlop={8}
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Image
          source={guideSource}
          resizeMode="contain"
          style={styles.image}
          accessibilityIgnoresInvertColors
        />
      </Pressable>
    </Animated.View>;
};

const styles = StyleSheet.create({
  floating: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: GUIDE_SIZE,
    height: GUIDE_SIZE,
    zIndex: 30,
    ...shadows.floating,
  },
  button: {
    width: GUIDE_SIZE,
    height: GUIDE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: GUIDE_SIZE,
    height: GUIDE_SIZE,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.95 }],
  },
});
