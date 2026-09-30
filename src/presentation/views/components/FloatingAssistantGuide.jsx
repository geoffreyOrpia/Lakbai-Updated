import { Image, Pressable, StyleSheet } from 'react-native';
import { layout, shadows } from "../../../theme.jsx";

const guideSource = require('../../../../assets/ask-lakbai-guide.png');

export const FloatingAssistantGuide = ({
  onPress,
  bottomOffset = layout.tabBarHeight + 20,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Ask LakBai"
    accessibilityHint="Open your local travel guide assistant"
    hitSlop={8}
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      { bottom: bottomOffset },
      pressed && styles.pressed,
    ]}
  >
    <Image
      source={guideSource}
      resizeMode="contain"
      style={styles.image}
      accessibilityIgnoresInvertColors
    />
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 8,
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    ...shadows.floating,
  },
  image: {
    width: 92,
    height: 92,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.95 }],
  },
});
