import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from "../../../theme.jsx";

const AUTO_CONTINUE_MS = 3600;

export const LandingScreen = ({ onContinue }) => {
  const insets = useSafeAreaInsets();
  const completedRef = useRef(false);
  const [reveal] = useState(() => new Animated.Value(0));
  const [settle] = useState(() => new Animated.Value(0));
  const [veil] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let active = true;
    let timer = null;

    const continueOnce = () => {
      if (!active || completedRef.current) return;
      completedRef.current = true;
      onContinue?.();
    };

    const start = async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      if (!active) return;

      if (reduceMotion) {
        reveal.setValue(1);
        settle.setValue(1);
        veil.setValue(0);
      } else {
        Animated.parallel([
          Animated.timing(reveal, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(settle, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(veil, {
            toValue: 0,
            duration: 1050,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }

      timer = setTimeout(continueOnce, reduceMotion ? 1800 : AUTO_CONTINUE_MS);
    };

    void start();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [onContinue, reveal, settle, veil]);

  const continueNow = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onContinue?.();
  };

  return (
    <View
      style={[
        styles.fullBleed,
        {
          marginTop: -insets.top,
          marginBottom: -insets.bottom,
          marginLeft: -insets.left,
          marginRight: -insets.right,
        },
      ]}
    >
      <StatusBar hidden />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="LakBai welcome screen"
        accessibilityHint="Tap to continue"
        onPress={continueNow}
        style={styles.pressable}
      >
        <Animated.Image
          source={require('../../../../assets/lakbai-welcome.png')}
          resizeMode="contain"
          style={[
            styles.artwork,
            {
              opacity: reveal,
              transform: [
                {
                  scale: settle.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.035, 1],
                  }),
                },
                {
                  translateY: settle.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.veil,
            {
              opacity: veil,
            },
          ]}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  fullBleed: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.brandCream,
  },
  pressable: {
    flex: 1,
    overflow: 'hidden',
  },
  artwork: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.brandCream,
  },
});
