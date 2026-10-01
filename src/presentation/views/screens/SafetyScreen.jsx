import { ScreenScrollView as ScrollView } from "../components/ScreenScrollView.jsx";
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFeedback } from "../../../feedback/FeedbackProvider.jsx";
import { AppHeader } from "../components/AppHeader.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { SectionHeader } from "../components/SectionHeader.jsx";
import { ScreenIntro } from "../components/ScreenIntro.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";

export const SafetyScreen = ({
  viewModel,
  onOpenSettings,
  onOpenDestination,
}) => {
  const state = viewModel.state;
  const { showSnackbar } = useFeedback();

  const call911 = async () => {
    const result = await viewModel.call911();
    if (!result.ok) {
      showSnackbar({
        message: result.message,
        tone: 'error',
      });
    }
  };

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader onOpenSettings={onOpenSettings} />

      <ScreenIntro
        eyebrow="SAFETY"
        title="Emergency & local safety"
        subtitle="Urgent help and destination-specific notes from guides you saved."
      />

      <View style={[styles.emergencyCard, shadows.card]}>
        <View style={styles.emergencyIcon}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.danger} />
        </View>
        <View style={styles.emergencyCopy}>
          <Text style={styles.emergencyTitle}>Emergency</Text>
          <Text style={styles.emergencyText}>National emergency hotline</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dial 911 national emergency hotline"
          accessibilityHint="Opens the phone app with 911 ready to dial"
          onPress={() => void call911()}
          style={({ pressed }) => [styles.emergencyCallButton, pressed && styles.pressed]}
        >
          <Ionicons name="call" size={16} color={colors.onPrimary} />
          <Text style={styles.emergencyCallButtonText}>Dial 911</Text>
        </Pressable>
      </View>

      {state.error ? <InfoBanner tone="warn" text={state.error} /> : null}

      {state.destinations.length ? <View style={styles.section}>
          <SectionHeader eyebrow="SAVED DESTINATIONS" title="Safety notes" />
          <View style={styles.destinationList}>
            {state.destinations.map(destination => <Pressable
              key={destination.destinationId}
              accessibilityRole="button"
              accessibilityLabel={`Open safety details for ${destination.name}`}
              onPress={() => onOpenDestination?.(destination.destinationId)}
              style={({ pressed }) => [
                styles.destinationCard,
                shadows.soft,
                pressed && styles.pressed,
              ]}
            >
                <View style={styles.destinationHeader}>
                  <View style={styles.destinationIcon}>
                    <Ionicons name="warning-outline" size={18} color={colors.accent} />
                  </View>
                  <View style={styles.destinationCopy}>
                    <Text style={styles.destinationName}>{destination.name}</Text>
                    <Text style={styles.destinationArea}>{destination.area}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                </View>

                <View style={styles.reminderList}>
                  {destination.reminders.slice(0, 4).map(reminder => <View key={reminder} style={styles.reminderRow}>
                      <View style={styles.reminderDot} />
                      <Text style={styles.reminderText}>{reminder}</Text>
                    </View>)}
                </View>
              </Pressable>)}
          </View>
        </View> : null}
    </ScrollView>;
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: layout.tabContentBottom,
    gap: spacing.lg,
  },
  emergencyCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F2CFCF',
    backgroundColor: colors.dangerSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emergencyIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyCopy: {
    flex: 1,
  },
  emergencyTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '800',
  },
  emergencyText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 10.8,
    lineHeight: 15,
  },
  emergencyCallButton: {
    minWidth: 92,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  emergencyCallButtonText: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '900',
  },
  section: {
    gap: spacing.sm,
  },
  destinationList: {
    gap: spacing.sm,
  },
  destinationCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
  },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  destinationIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationCopy: {
    flex: 1,
  },
  destinationName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  destinationArea: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  reminderList: {
    gap: spacing.xs,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  reminderDot: {
    width: 5,
    height: 5,
    marginTop: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  reminderText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 11.2,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.72,
  },
});
