import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import type { DestinationCategory } from '../data/destinations';
import type { SignupOnboardingPreferences, TravelPace } from '../storage/onboardingStore';
import { colors, layout, radius, spacing } from '../theme';

type Props = {
  onComplete: (preferences: SignupOnboardingPreferences) => Promise<void>;
};

type InterestOption = {
  key: DestinationCategory;
  label: string;
  description: string;
  icon: 'water-outline' | 'business-outline' | 'leaf-outline' | 'trail-sign-outline';
};

const interestOptions: InterestOption[] = [
  { key: 'island', label: 'Island escapes', description: 'Beaches, coastlines, and island stops', icon: 'water-outline' },
  { key: 'city', label: 'City discoveries', description: 'Landmarks, parks, and local culture', icon: 'business-outline' },
  { key: 'nature', label: 'Nature trips', description: 'Scenic outdoor destinations and green spaces', icon: 'leaf-outline' },
  { key: 'adventure', label: 'Adventure trails', description: 'Hikes, trails, and active experiences', icon: 'trail-sign-outline' },
];

const paceOptions: Array<{ key: TravelPace; title: string; text: string; icon: 'cafe-outline' | 'compass-outline' | 'flash-outline' }> = [
  { key: 'relaxed', title: 'Relaxed', text: 'Fewer stops and more time at each destination.', icon: 'cafe-outline' },
  { key: 'balanced', title: 'Balanced', text: 'A practical mix of exploring and downtime.', icon: 'compass-outline' },
  { key: 'active', title: 'Active', text: 'More stops, trails, and full-day exploration.', icon: 'flash-outline' },
];

export function SignupOnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<DestinationCategory[]>([]);
  const [travelPace, setTravelPace] = useState<TravelPace>('balanced');
  const [offlineReminder, setOfflineReminder] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const progress = useMemo(() => `${step + 1} of 3`, [step]);

  const toggleInterest = (category: DestinationCategory) => {
    setInterests((current) => current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category]);
  };

  const next = async () => {
    setError('');
    if (step === 0 && interests.length === 0) {
      setError('Choose at least one travel interest to continue.');
      return;
    }

    if (step < 2) {
      setStep((current) => current + 1);
      return;
    }

    setSaving(true);
    try {
      await onComplete({ interests, travelPace, offlineReminder });
    } catch {
      setError('Your setup could not be saved. Please try again.');
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>ACCOUNT SETUP</Text>
        </View>
        <Text style={styles.progressText}>{progress}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / 3) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 0 ? (
          <View style={styles.stepContent}>
            <View style={styles.headingBlock}>
              <View style={styles.headingIcon}><Ionicons name="sparkles-outline" size={22} color={colors.forest} /></View>
              <Text style={styles.eyebrow}>MAKE IT YOURS</Text>
              <Text style={styles.title}>What do you want to explore?</Text>
              <Text style={styles.subtitle}>Choose the types of local experiences you are most interested in. You can select more than one.</Text>
            </View>

            <View style={styles.optionList}>
              {interestOptions.map((option) => {
                const selected = interests.includes(option.key);
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => toggleInterest(option.key)}
                    style={({ pressed }) => [styles.choiceCard, selected && styles.choiceCardSelected, pressed && styles.pressed]}
                  >
                    <View style={[styles.choiceIcon, selected && styles.choiceIconSelected]}>
                      <Ionicons name={option.icon} size={21} color={selected ? colors.white : colors.forest} />
                    </View>
                    <View style={styles.choiceCopy}>
                      <Text style={styles.choiceTitle}>{option.label}</Text>
                      <Text style={styles.choiceText}>{option.description}</Text>
                    </View>
                    <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? colors.forest : colors.border} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.stepContent}>
            <View style={styles.headingBlock}>
              <View style={[styles.headingIcon, styles.headingIconOrange]}><Ionicons name="speedometer-outline" size={22} color={colors.orange} /></View>
              <Text style={styles.eyebrow}>YOUR TRAVEL STYLE</Text>
              <Text style={styles.title}>How do you like to travel?</Text>
              <Text style={styles.subtitle}>This helps LakbayLokal understand the kind of itinerary experience you prefer.</Text>
            </View>

            <View style={styles.optionList}>
              {paceOptions.map((option) => {
                const selected = travelPace === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setTravelPace(option.key)}
                    style={({ pressed }) => [styles.choiceCard, selected && styles.choiceCardSelected, pressed && styles.pressed]}
                  >
                    <View style={[styles.choiceIcon, selected && styles.choiceIconSelected]}>
                      <Ionicons name={option.icon} size={21} color={selected ? colors.white : colors.forest} />
                    </View>
                    <View style={styles.choiceCopy}>
                      <Text style={styles.choiceTitle}>{option.title}</Text>
                      <Text style={styles.choiceText}>{option.text}</Text>
                    </View>
                    <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={21} color={selected ? colors.forest : colors.muted} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.stepContent}>
            <View style={styles.headingBlock}>
              <View style={styles.headingIcon}><Ionicons name="cloud-offline-outline" size={22} color={colors.forest} /></View>
              <Text style={styles.eyebrow}>OFFLINE-FIRST</Text>
              <Text style={styles.title}>Be ready before the signal drops.</Text>
              <Text style={styles.subtitle}>LakbayLokal is designed around preparing destination information before your trip.</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryIcon}><Ionicons name="download-outline" size={19} color={colors.forest} /></View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryTitle}>Download before leaving</Text>
                  <Text style={styles.summaryText}>Save destination packs while connected so selected travel information remains available offline.</Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <View style={styles.summaryIcon}><Ionicons name="shield-checkmark-outline" size={19} color={colors.forest} /></View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryTitle}>Keep preparation visible</Text>
                  <Text style={styles.summaryText}>Use the Safety checklist before heading to destinations with limited connectivity.</Text>
                </View>
              </View>
            </View>

            <View style={styles.reminderCard}>
              <View style={styles.reminderCopy}>
                <Text style={styles.reminderTitle}>Offline preparation reminder</Text>
                <Text style={styles.reminderText}>Keep this preference enabled so the app can surface preparation prompts in the experience.</Text>
              </View>
              <Switch
                value={offlineReminder}
                onValueChange={setOfflineReminder}
                trackColor={{ false: colors.border, true: '#AFCFB8' }}
                thumbColor={offlineReminder ? colors.forest : colors.surface}
              />
            </View>

            <View style={styles.readyCard}>
              <Ionicons name="checkmark-circle" size={22} color={colors.forest} />
              <View style={styles.readyCopy}>
                <Text style={styles.readyTitle}>Your account is ready</Text>
                <Text style={styles.readyText}>Finish setup to start exploring, downloading packs, and building your own trips.</Text>
              </View>
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 ? (
          <Pressable disabled={saving} onPress={() => setStep((current) => current - 1)} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={18} color={colors.forest} />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        ) : <View style={styles.backPlaceholder} />}

        <Pressable disabled={saving} onPress={() => void next()} style={({ pressed }) => [styles.nextButton, saving && styles.disabled, pressed && !saving && styles.pressed]}>
          <Text style={styles.nextButtonText}>{saving ? 'Saving…' : step === 2 ? 'Finish setup' : 'Continue'}</Text>
          <Ionicons name={step === 2 ? 'checkmark' : 'arrow-forward'} size={18} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  topBar: { paddingHorizontal: layout.screenGutter, paddingTop: spacing.lg, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.softGreen },
  stepBadgeText: { color: colors.forest, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.7 },
  progressText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  progressTrack: { height: 3, marginHorizontal: layout.screenGutter, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.forest },
  content: { paddingHorizontal: layout.screenGutter, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  stepContent: { gap: spacing.xl },
  headingBlock: { alignItems: 'flex-start' },
  headingIcon: { width: 46, height: 46, borderRadius: radius.lg, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  headingIconOrange: { backgroundColor: colors.softOrange },
  eyebrow: { color: colors.orange, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  title: { marginTop: spacing.xs, color: colors.text, fontSize: 27, lineHeight: 31, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { marginTop: spacing.sm, maxWidth: 560, color: colors.muted, fontSize: 12.8, lineHeight: 18 },
  optionList: { gap: spacing.sm },
  choiceCard: { minHeight: 78, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  choiceCardSelected: { borderColor: '#99BFA5', backgroundColor: colors.softGreen },
  choiceIcon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  choiceIconSelected: { backgroundColor: colors.forest },
  choiceCopy: { flex: 1 },
  choiceTitle: { color: colors.text, fontSize: 13.5, fontWeight: '900' },
  choiceText: { marginTop: 3, color: colors.muted, fontSize: 10.8, lineHeight: 15 },
  summaryCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.md },
  summaryRow: { flexDirection: 'row', gap: spacing.md },
  summaryIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: colors.text, fontSize: 12.5, fontWeight: '900' },
  summaryText: { marginTop: 3, color: colors.muted, fontSize: 10.8, lineHeight: 15 },
  summaryDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  reminderCard: { minHeight: 76, borderWidth: 1, borderColor: '#C8DCCB', borderRadius: radius.lg, backgroundColor: colors.softGreen, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reminderCopy: { flex: 1 },
  reminderTitle: { color: colors.forestDark, fontSize: 12.5, fontWeight: '900' },
  reminderText: { marginTop: 3, color: colors.muted, fontSize: 10.5, lineHeight: 15 },
  readyCard: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.softOrange, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  readyCopy: { flex: 1 },
  readyTitle: { color: colors.text, fontSize: 12.5, fontWeight: '900' },
  readyText: { marginTop: 3, color: colors.muted, fontSize: 10.8, lineHeight: 15 },
  errorBox: { marginTop: spacing.lg, minHeight: 44, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.softOrange, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  errorText: { flex: 1, color: colors.danger, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  footer: { paddingHorizontal: layout.screenGutter, paddingTop: spacing.sm, paddingBottom: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backButton: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  backButtonText: { color: colors.forest, fontSize: 12, fontWeight: '900' },
  backPlaceholder: { width: 0 },
  nextButton: { flex: 1, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.forest, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  nextButtonText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.74 },
});
