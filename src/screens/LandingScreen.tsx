import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={styles.hero}>
        <View style={styles.logoShell}>
          <Image source={require('../../assets/logo-mark.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.eyebrow}>WELCOME TO LAKBAYLOKAL</Text>
        <Text style={styles.title}>Go beyond. Go local.</Text>
        <Text style={styles.subtitle}>
          Discover Davao del Norte with an offline-first travel companion designed for local exploration.
        </Text>
      </View>

      <View style={styles.featureCard}>
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
      </View>

      <View style={styles.footer}>
        <View style={styles.offlinePill}>
          <Ionicons name="cloud-offline-outline" size={15} color={colors.forest} />
          <Text style={styles.offlinePillText}>Built for offline-first travel</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onContinue}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>Get started</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </Pressable>

        <Text style={styles.note}>You can browse destinations as a guest or create an account for personal itineraries.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  hero: {
    alignItems: 'center',
  },
  logoShell: {
    width: 92,
    height: 92,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 72,
    height: 72,
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
    minHeight: 92,
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
  offlinePill: {
    alignSelf: 'center',
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.softGreen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  offlinePillText: {
    color: colors.forest,
    fontSize: 10.5,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 50,
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
