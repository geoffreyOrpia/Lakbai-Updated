import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { INTEREST_OPTIONS, PACE_OPTIONS } from "../../viewmodels/OnboardingViewModel.jsx";
import { PrimaryButton, SecondaryButton } from "../components/Buttons.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
const STEP_TITLES = ['Travel interests', 'Travel pace'];
export const OnboardingScreen = ({
  viewModel
}) => {
  const state = viewModel.state;
  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.stepRow}>
          {[0, 1].map(step => <View key={step} style={[styles.stepDot, step <= state.step && styles.stepDotActive]} />)}
        </View>
        <Text style={styles.eyebrow}>TRAVEL SETUP · {state.step + 1}/2</Text>
        <Text style={styles.title}>{STEP_TITLES[state.step]}</Text>
        <Text style={styles.subtitle}>Personalize LakBai so recommendations and preparation fit how you travel.</Text>
      </View>

      {state.step === 0 ? <View style={[styles.card, shadows.card]}>
          <Text style={styles.cardTitle}>What draws you to travel?</Text>
          <Text style={styles.cardText}>Pick one or more. These shape the destinations we highlight first.</Text>
          <View style={styles.interestGrid}>
            {INTEREST_OPTIONS.map(interest => {
          const selected = state.interests.includes(interest);
          return <Pressable key={interest} accessibilityRole="checkbox" accessibilityState={{
            checked: selected
          }} accessibilityLabel={interest} onPress={() => viewModel.toggleInterest(interest)} style={({
            pressed
          }) => [styles.interestChip, selected && styles.interestChipSelected, pressed && styles.pressed]}>
                  <Ionicons name={selected ? 'checkmark' : 'ellipse-outline'} size={13} color={selected ? colors.onPrimary : colors.faint} />
                  <Text style={[styles.interestText, selected && styles.interestTextSelected]}>{interest}</Text>
                </Pressable>;
        })}
          </View>
        </View> : null}

      {state.step === 1 ? <View style={[styles.card, shadows.card]}>
          <Text style={styles.cardTitle}>How do you like to move?</Text>
          <Text style={styles.cardText}>Your pace guides how we suggest arranging stops in an itinerary.</Text>
          <View style={styles.paceList}>
            {PACE_OPTIONS.map(option => {
          const selected = state.pace === option.key;
          return <Pressable key={option.key} accessibilityRole="radio" accessibilityState={{
            selected
          }} accessibilityLabel={`${option.label}. ${option.text}`} onPress={() => viewModel.setPace(option.key)} style={({
            pressed
          }) => [styles.paceRow, selected && styles.paceRowSelected, pressed && styles.pressed]}>
                  <View style={[styles.paceRadio, selected && styles.paceRadioSelected]}>
                    {selected ? <View style={styles.paceRadioInner} /> : null}
                  </View>
                  <View style={styles.paceCopy}>
                    <Text style={[styles.paceLabel, selected && styles.paceLabelSelected]}>{option.label}</Text>
                    <Text style={styles.paceText}>{option.text}</Text>
                  </View>
                </Pressable>;
        })}
          </View>
        </View> : null}

      {state.error ? <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
          <Text style={styles.errorText}>{state.error}</Text>
        </View> : null}

      <View style={styles.actions}>
        {state.step > 0 ? <SecondaryButton label="Back" icon="arrow-back" onPress={() => viewModel.back()} /> : null}
        {state.step < 1 ? <PrimaryButton label="Continue" onPress={() => viewModel.next()} /> : <PrimaryButton label={state.saving ? 'Saving…' : 'Finish setup'} icon="checkmark" onPress={() => void viewModel.complete()} disabled={state.saving} />}
      </View>
    </ScrollView>;
};
const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenGutter,
    paddingVertical: spacing.xl,
    gap: spacing.lg
  },
  header: {
    gap: spacing.xs
  },
  stepRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.xs
  },
  stepDot: {
    width: 26,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken
  },
  stepDotActive: {
    backgroundColor: colors.primary
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8
  },
  title: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -0.8
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12.5,
    lineHeight: 18
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.sm
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900'
  },
  cardText: {
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 17
  },
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs
  },
  interestChip: {
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  interestChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  interestText: {
    color: colors.textSecondary,
    fontSize: 11.5,
    fontWeight: '700'
  },
  interestTextSelected: {
    color: colors.onPrimary
  },
  paceList: {
    gap: spacing.xs,
    marginTop: spacing.xxs
  },
  paceRow: {
    minHeight: 62,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  paceRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySofter
  },
  paceRadio: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center'
  },
  paceRadioSelected: {
    borderColor: colors.primary
  },
  paceRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primary
  },
  paceCopy: {
    flex: 1
  },
  paceLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  paceLabelSelected: {
    color: colors.primary
  },
  paceText: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  offlineIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center'
  },
  offlineCopy: {
    flex: 1
  },
  offlineTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  offlineText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15
  },
  offlineNote: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  offlineNoteText: {
    flex: 1,
    color: colors.primary,
    fontSize: 10.8,
    lineHeight: 15,
    fontWeight: '700'
  },
  errorBox: {
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 11.2,
    lineHeight: 15,
    fontWeight: '700'
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  pressed: {
    opacity: 0.78
  }
});
