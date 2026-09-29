import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors } from "../../../theme.jsx";
import { WelcomeLandscape } from "../components/WelcomeLandscape.jsx";

const AUTO_CONTINUE_MS = 3600;

export const LandingScreen = ({ onContinue }) => {
  const { width, height } = useWindowDimensions();
  const completedRef = useRef(false);
  const [logoReveal] = useState(() => new Animated.Value(0));
  const [landscapeReveal] = useState(() => new Animated.Value(0));
  const [settle] = useState(() => new Animated.Value(0));

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
        logoReveal.setValue(1);
        landscapeReveal.setValue(1);
        settle.setValue(1);
      } else {
        Animated.parallel([
          Animated.timing(logoReveal, {
            toValue: 1,
            duration: 750,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(landscapeReveal, {
            toValue: 1,
            duration: 1050,
            delay: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(settle, {
            toValue: 1,
            duration: 1400,
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
  }, [landscapeReveal, logoReveal, onContinue, settle]);

  const continueNow = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onContinue?.();
  };

  const compact = height < 700;
  const logoWidth = Math.min(width * (compact ? 0.6 : 0.66), 310);
  const logoHeight = logoWidth * 0.64;
  const landscapeHeight = Math.min(
    Math.max(height * (compact ? 0.43 : 0.49), 300),
    500,
  );

  return (
    <View style={styles.screen}>
      <StatusBar hidden />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="LakBai welcome screen"
        accessibilityHint="Tap to continue"
        onPress={continueNow}
        style={styles.pressable}
      >
        <Animated.View
          style={[
            styles.logoWrap,
            compact && styles.logoWrapCompact,
            {
              opacity: logoReveal,
              transform: [{
                translateY: settle.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              }],
            },
          ]}
        >
          <Image
            source={require('../../../../assets/lakbai-lockup.png')}
            resizeMode="contain"
            style={{
              width: logoWidth,
              height: logoHeight,
            }}
            accessibilityLabel="LakBai. Explore Davao del Norte."
          />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.landscape,
            {
              height: landscapeHeight,
              opacity: landscapeReveal,
              transform: [{
                translateY: settle.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              }],
            },
          ]}
        >
          <WelcomeLandscape width={width} height={landscapeHeight} />
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.brandCream,
  },
  pressable: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.brandCream,
  },
  logoWrap: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  logoWrapCompact: {
    top: '15%',
  },
  landscape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});
