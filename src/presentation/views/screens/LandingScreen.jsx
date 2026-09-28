import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
import { BrandMarkLayer, BrandWordmark } from "../components/BrandMark.jsx";
const features = [{
  icon: 'phone-portrait-outline',
  title: 'Ready from first launch',
  text: 'Destination guides and local information are bundled on your device from the beginning.'
}, {
  icon: 'calendar-outline',
  title: 'Build your own itinerary',
  text: 'Organize curated destinations into a personal trip plan that stays on your device.'
}, {
  icon: 'shield-checkmark-outline',
  title: 'Travel more prepared',
  text: 'Keep offline safety reminders and trip-readiness details close when you need them.'
}];
export const LandingScreen = ({
  onContinue
}) => {
  const [logoEntrance] = useState(() => new Animated.Value(0));
  const [heroEntrance] = useState(() => new Animated.Value(0));
  const [featureEntrance] = useState(() => new Animated.Value(0));
  const [footerEntrance] = useState(() => new Animated.Value(0));
  const [float] = useState(() => new Animated.Value(0));
  const [haloPulse] = useState(() => new Animated.Value(0));
  const [sunGlow] = useState(() => new Animated.Value(0));
  const [roadTravel] = useState(() => new Animated.Value(0));
  const [landscapeReveal] = useState(() => new Animated.Value(0));
  const [detailsReveal] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    let floatLoop = null;
    let haloLoop = null;
    const startMotion = async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      if (!active) return;
      if (reduceMotion) {
        logoEntrance.setValue(1);
        heroEntrance.setValue(1);
        featureEntrance.setValue(1);
        footerEntrance.setValue(1);
        sunGlow.setValue(1);
        roadTravel.setValue(1);
        landscapeReveal.setValue(1);
        detailsReveal.setValue(1);
        return;
      }
      Animated.sequence([
        Animated.timing(logoEntrance, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.parallel([
          Animated.timing(landscapeReveal, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(sunGlow, {
            toValue: 1,
            duration: 360,
            delay: 90,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(roadTravel, {
            toValue: 1,
            duration: 500,
            delay: 150,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
        ]),
        Animated.parallel([
          Animated.timing(detailsReveal, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(heroEntrance, {
            toValue: 1,
            duration: 420,
            delay: 70,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
        ]),
        Animated.parallel([Animated.timing(featureEntrance, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }), Animated.timing(footerEntrance, {
        toValue: 1,
        duration: 460,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })])]).start(() => {
        if (!active) return;
        floatLoop = Animated.loop(Animated.sequence([Animated.timing(float, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }), Animated.timing(float, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })]));
        haloLoop = Animated.loop(Animated.sequence([Animated.timing(haloPulse, {
          toValue: 1,
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }), Animated.timing(haloPulse, {
          toValue: 0,
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })]));
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
  }, [detailsReveal, featureEntrance, float, footerEntrance, haloPulse, heroEntrance, landscapeReveal, logoEntrance, roadTravel, sunGlow]);
  const logoTranslateY = Animated.add(logoEntrance.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0]
  }), float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4]
  }));
  const logoRotateX = Animated.add(logoEntrance.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0]
  }), float.interpolate({
    inputRange: [0, 1],
    outputRange: [-1.2, 1.2]
  }));
  const logoRotateY = Animated.add(logoEntrance.interpolate({
    inputRange: [0, 1],
    outputRange: [-16, 0]
  }), float.interpolate({
    inputRange: [0, 1],
    outputRange: [-1.8, 1.8]
  }));
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={styles.hero}>
        <View style={styles.heroVisual}>
          <Animated.View pointerEvents="none" style={[styles.haloOuter, {
          opacity: logoEntrance.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.35]
          }),
          transform: [{
            scale: haloPulse.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.08]
            })
          }]
        }]} />
          <Animated.View pointerEvents="none" style={[styles.sunGlow, {
          opacity: sunGlow.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.78]
          }),
          transform: [{
            scale: sunGlow.interpolate({
              inputRange: [0, 1],
              outputRange: [0.45, 1]
            })
          }]
        }]} />

          <Animated.View pointerEvents="none" style={[styles.logoDepthShadow, {
          opacity: logoEntrance.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.22]
          }),
          transform: [{
            translateY: logoEntrance.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 12]
            })
          }, {
            scaleX: logoEntrance.interpolate({
              inputRange: [0, 1],
              outputRange: [0.62, 1]
            })
          }]
        }]} />

          <Animated.View style={[styles.logoStage, {
          transform: [{
            perspective: 900
          }, {
            translateY: logoTranslateY
          }, {
            rotateX: logoRotateX.interpolate({
              inputRange: [-20, 20],
              outputRange: ['-20deg', '20deg']
            })
          }, {
            rotateY: logoRotateY.interpolate({
              inputRange: [-20, 20],
              outputRange: ['-20deg', '20deg']
            })
          }, {
            scale: logoEntrance.interpolate({
              inputRange: [0, 0.72, 1],
              outputRange: [0.72, 1.05, 1]
            })
          }]
        }]}>
            <Animated.View style={[styles.logoLayer, {
              opacity: logoEntrance,
              transform: [{
                scale: logoEntrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1]
                })
              }]
            }]}>
              <BrandMarkLayer part="frame" size={128} />
            </Animated.View>
            <Animated.View style={[styles.logoLayer, {
              opacity: landscapeReveal,
              transform: [{
                translateY: landscapeReveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0]
                })
              }]
            }]}>
              <BrandMarkLayer part="landscape" size={128} />
            </Animated.View>
            <Animated.View style={[styles.logoLayer, {
              opacity: sunGlow,
              transform: [{
                scale: sunGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1]
                })
              }]
            }]}>
              <BrandMarkLayer part="sun" size={128} />
            </Animated.View>
            <Animated.View style={[styles.logoLayer, { opacity: roadTravel }]}>
              <BrandMarkLayer part="road" size={128} />
            </Animated.View>
            <Animated.View style={[styles.logoLayer, {
              opacity: detailsReveal,
              transform: [{
                scale: detailsReveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.94, 1]
                })
              }]
            }]}>
              <BrandMarkLayer part="details" size={128} />
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.roadTravel, {
              opacity: roadTravel.interpolate({
                inputRange: [0, 0.15, 0.75, 1],
                outputRange: [0, 0.85, 0.45, 0]
              }),
              transform: [{
                translateY: roadTravel.interpolate({
                  inputRange: [0, 1],
                  outputRange: [38, -38]
                })
              }, {
                scaleX: roadTravel.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.45, 1]
                })
              }]
            }]} />
          </Animated.View>
        </View>

        <Animated.View style={[styles.heroCopy, {
        opacity: heroEntrance,
        transform: [{
          translateY: heroEntrance.interpolate({
            inputRange: [0, 1],
            outputRange: [12, 0]
          })
        }]
      }]}>
          <View style={styles.locationBadge}>
            <Ionicons name="navigate-outline" size={13} color={colors.primary} />
            <Text style={styles.locationBadgeText}>DAVAO DEL NORTE · OFFLINE-FIRST</Text>
          </View>
          <Text style={styles.eyebrow}>WELCOME TO</Text>
          <BrandWordmark showTagline align="center" />
          <Text style={styles.title}>Go beyond. Go local.</Text>
          <Text style={styles.subtitle}>
            Discover Davao del Norte with an offline-first travel companion designed for local exploration.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.featureCard, {
      opacity: featureEntrance,
      transform: [{
        translateY: featureEntrance.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0]
        })
      }]
    }]}>
        {features.map((feature, index) => <View key={feature.title} style={[styles.featureRow, index < features.length - 1 && styles.featureDivider]}>
            <View style={[styles.featureIcon, index === 1 && styles.featureIconOrange]}>
              <Ionicons name={feature.icon} size={21} color={index === 1 ? colors.accent : colors.primary} />
            </View>
            <View style={styles.featureCopy}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          </View>)}
      </Animated.View>

      <Animated.View style={[styles.footer, {
      opacity: footerEntrance,
      transform: [{
        translateY: footerEntrance.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0]
        })
      }]
    }]}>
        <Pressable accessibilityRole="button" onPress={onContinue} style={({
        pressed
      }) => [styles.primaryButton, pressed && styles.pressed]}>
          <Text style={styles.primaryButtonText}>Get started</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
        </Pressable>

        <Text style={styles.note}>No account required. Your preferences and itineraries stay on this device.</Text>
      </Animated.View>
    </ScrollView>;
};
const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
    gap: spacing.xl
  },
  hero: {
    alignItems: 'center'
  },
  heroVisual: {
    width: 208,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm
  },
  haloOuter: {
    position: 'absolute',
    width: 166,
    height: 166,
    borderRadius: 83,
    borderWidth: 1,
    borderColor: '#CBE6D5',
    backgroundColor: colors.primarySofter
  },
  sunGlow: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    right: 26,
    top: 14,
    backgroundColor: colors.accentSoft,
    shadowColor: colors.accent,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 8
    },
    elevation: 3
  },
  logoDepthShadow: {
    position: 'absolute',
    width: 112,
    height: 24,
    borderRadius: 999,
    bottom: 18,
    backgroundColor: colors.primaryDark
  },
  logoStage: {
    width: 128,
    height: 162,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoLayer: {
    position: 'absolute',
    width: 128,
    height: 154,
    alignItems: 'center',
    justifyContent: 'center'
  },
  roadTravel: {
    position: 'absolute',
    width: 22,
    height: 74,
    left: 53,
    top: 72,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.34)'
  },
  heroCopy: {
    width: '100%',
    alignItems: 'center'
  },
  locationBadge: {
    minHeight: 29,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs
  },
  locationBadgeText: {
    color: colors.primary,
    fontSize: 9.2,
    fontWeight: '900',
    letterSpacing: 0.45
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.9,
    textAlign: 'center'
  },
  title: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center'
  },
  subtitle: {
    maxWidth: 520,
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 13.2,
    lineHeight: 19,
    textAlign: 'center'
  },
  featureCard: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...shadows.card
  },
  featureRow: {
    minHeight: 88,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  featureDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center'
  },
  featureIconOrange: {
    backgroundColor: colors.accentSoft
  },
  featureCopy: {
    flex: 1
  },
  featureTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '900'
  },
  featureText: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 11.3,
    lineHeight: 16
  },
  footer: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    gap: spacing.sm
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.card
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 13.5,
    fontWeight: '900'
  },
  note: {
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: 'center'
  },
  pressed: {
    opacity: 0.76
  }
});
