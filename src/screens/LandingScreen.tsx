import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, layout, radius, spacing } from '../theme';

type Props = {
  onContinue: () => void;
};

const features = [
  {
    icon: 'download-outline' as const,
    title: 'Prepare before you go',
    text: 'Save destination packs so important local information stays available without a signal.',
  },
  {
    icon: 'calendar-outline' as const,
    title: 'Build your own itinerary',
    text: 'Organize curated destinations into a personal trip plan that stays on your device.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Travel more prepared',
    text: 'Keep offline safety reminders and trip-readiness details close when you need them.',
  },
];

export function LandingScreen({ onContinue }: Props) {
  const logoEntrance = useRef(new Animated.Value(0)).current;
  const heroEntrance = useRef(new Animated.Value(0)).current;
  const featureEntrance = useRef(new Animated.Value(0)).current;
  const footerEntrance = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const haloPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    let floatLoop: Animated.CompositeAnimation | null = null;
    let haloLoop: Animated.CompositeAnimation | null = null;

    const startMotion = async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      if (!active) return;

      if (reduceMotion) {
        logoEntrance.setValue(1);
        heroEntrance.setValue(1);
        featureEntrance.setValue(1);
        footerEntrance.setValue(1);
        return;
      }

      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoEntrance, {
            toValue: 1,
            duration: 620,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(heroEntrance, {
            toValue: 1,
            duration: 520,
            delay: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(featureEntrance, {
            toValue: 1,
            duration: 460,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(footerEntrance, {
            toValue: 1,
            duration: 460,
            delay: 100,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        if (!active) return;

        floatLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(float, {
              toValue: 1,
              duration: 1800,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(float, {
              toValue: 0,
              duration: 1800,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        );

        haloLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(haloPulse, {
              toValue: 1,
              duration: 2100,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(haloPulse, {
              toValue: 0,
              duration: 2100,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        );

        floatLoop.start();
        haloLoop.start();
      });
    };

    void startMotion();

    return () => {
      active = false;
      floatLoop?.stop();
      haloLoop?.stop();
    };
  }, [featureEntrance, float, footerEntrance, haloPulse, heroEntrance, logoEntrance]);

  const logoTranslateY = Animated.add(
    logoEntrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
    float.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }),
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroVisual}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.haloOuter,
              {
                opacity: logoEntrance.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] }),
                transform: [
                  {
                    scale: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.haloInner,
              {
                opacity: logoEntrance,
                transform: [
                  {
                    scale: logoEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
                  },
                ],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.logoShell,
              {
                opacity: logoEntrance,
                transform: [
                  { translateY: logoTranslateY },
                  {
                    scale: logoEntrance.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.82, 1.04, 1] }),
                  },
                ],
              },
            ]}
          >
            <Image source={require('../../assets/logo-mark.png')} style={styles.logo} resizeMode="contain" />
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.travelAccent,
              styles.travelAccentCompass,
              {
                opacity: logoEntrance,
                transform: [
                  {
                    translateX: logoEntrance.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }),
                  },
                  {
                    translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="compass-outline" size={17} color={colors.forest} />
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.travelAccent,
              styles.travelAccentPin,
              {
                opacity: logoEntrance,
                transform: [
                  {
                    translateX: logoEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
                  },
                  {
                    translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="location" size={17} color={colors.orange} />
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.heroCopy,
            {
              opacity: heroEntrance,
              transform: [
                {
                  translateY: heroEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
                },
              ],
            },
          ]}
        >
          <View style={styles.locationBadge}>
            <Ionicons name="navigate-outline" size={13} color={colors.forest} />
            <Text style={styles.locationBadgeText}>DAVAO DEL NORTE · OFFLINE-FIRST</Text>
          </View>
          <Text style={styles.eyebrow}>WELCOME TO LAKBAYLOKAL</Text>
          <Text style={styles.title}>Go beyond. Go local.</Text>
          <Text style={styles.subtitle}>
            Discover Davao del Norte with an offline-first travel companion designed for local exploration.
          </Text>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.featureCard,
          {
            opacity: featureEntrance,
            transform: [
              {
                translateY: featureEntrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
              },
            ],
          },
        ]}
      >
        {features.map((feature, index) => (
          <View key={feature.title} style={[styles.featureRow, index < features.length - 1 && styles.featureDivider]}>
            <View style={[styles.featureIcon, index === 1 && styles.featureIconOrange]}>
              <Ionicons name={feature.icon} size={21} color={index === 1 ? colors.orange : colors.forest} />
            </View>
            <View style={styles.featureCopy}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      <Animated.View
        style={[
          styles.footer,
          {
            opacity: footerEntrance,
            transform: [
              {
                translateY: footerEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
              },
            ],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={onContinue}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>Get started</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </Pressable>

        <Text style={styles.note}>Browse as a guest or create an account for your own itineraries.</Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  hero: {
    alignItems: 'center',
  },
  heroVisual: {
    width: 184,
    height: 154,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  haloOuter: {
    position: 'absolute',
    width: 142,
    height: 142,
    borderRadius: 71,
    borderWidth: 1,
    borderColor: '#AFCDB7',
    backgroundColor: colors.softGreen,
  },
  haloInner: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#F0F6EF',
  },
  logoShell: {
    width: 102,
    height: 102,
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#C9DDCC',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 7,
    shadowColor: '#173F2B',
    shadowOpacity: 0.13,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  logo: {
    width: 82,
    height: 82,
  },
  travelAccent: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#173F2B',
    shadowOpacity: 0.09,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },
  travelAccentCompass: {
    left: 8,
    top: 28,
  },
  travelAccentPin: {
    right: 6,
    bottom: 24,
  },
  heroCopy: {
    width: '100%',
    alignItems: 'center',
  },
  locationBadge: {
    minHeight: 29,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.softGreen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  locationBadgeText: {
    color: colors.forest,
    fontSize: 9.2,
    fontWeight: '900',
    letterSpacing: 0.45,
  },
  eyebrow: {
    color: colors.orange,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.9,
    textAlign: 'center',
  },
  title: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 31,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 520,
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 13.2,
    lineHeight: 19,
    textAlign: 'center',
  },
  featureCard: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  featureRow: {
    minHeight: 88,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconOrange: {
    backgroundColor: colors.softOrange,
  },
  featureCopy: {
    flex: 1,
  },
  featureTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '900',
  },
  featureText: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 11.3,
    lineHeight: 16,
  },
  footer: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: spacing.sm,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.forest,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 13.5,
    fontWeight: '900',
  },
  note: {
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.76,
  },
});
