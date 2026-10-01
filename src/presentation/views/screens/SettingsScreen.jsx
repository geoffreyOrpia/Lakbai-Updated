import { ScreenScrollView as ScrollView } from "../components/ScreenScrollView.jsx";
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_VERSION } from "../../../core/appInfo.jsx";
import { formatSizeKb } from "../../../core/utils/format.jsx";
import { useFeedback } from "../../../feedback/FeedbackProvider.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
import {
  SETTINGS_INTEREST_OPTIONS,
  SETTINGS_PACE_OPTIONS,
} from "../../viewmodels/SettingsViewModel.jsx";
import { BackAction, PrimaryButton, SecondaryButton } from "../components/Buttons.jsx";
import { Disclosure } from "../components/Disclosure.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { ScreenIntro } from "../components/ScreenIntro.jsx";

const ChoiceChip = ({ label, selected, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={onPress}
    style={({ pressed }) => [
      styles.choice,
      selected && styles.choiceSelected,
      pressed && styles.pressed,
    ]}
  >
    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
  </Pressable>
);

const SettingRow = ({ icon, title, text, children }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingIcon}>
      <Ionicons name={icon} size={18} color={colors.brandForest} />
    </View>
    <View style={styles.settingCopy}>
      <Text style={styles.settingTitle}>{title}</Text>
      {text ? <Text style={styles.settingText}>{text}</Text> : null}
      {children}
    </View>
  </View>
);

export const SettingsScreen = ({ viewModel }) => {
  const state = viewModel.state;
  const { showSnackbar, showConfirm } = useFeedback();

  const save = async () => {
    const result = await viewModel.save();
    showSnackbar({
      message: result.message,
      tone: result.ok ? 'success' : 'error',
    });
  };

  const clearRecovery = () => {
    showConfirm({
      title: 'Clear saved navigation recovery?',
      message: 'This removes only the resumable navigation checkpoint. Your Trips and downloaded destination guides are kept.',
      confirmLabel: 'Clear',
      tone: 'danger',
      onConfirm: async () => {
        const result = await viewModel.clearNavigationRecovery();
        showSnackbar({
          message: result.message,
          tone: result.ok ? 'success' : 'error',
        });
      },
    });
  };

  const restartSetup = () => {
    showConfirm({
      title: 'Restart LakBai setup?',
      message: 'Your travel preferences will be reset and the Welcome/Onboarding flow will appear again. When setup is finished, LakBai will open Home. Trips, favorites, and offline guides are not deleted.',
      confirmLabel: 'Restart setup',
      tone: 'danger',
      onConfirm: async () => {
        const result = await viewModel.restartSetup();
        if (!result.ok) {
          showSnackbar({ message: result.message, tone: 'error' });
        }
      },
    });
  };

  if (state.loading) {
    return <View style={styles.center}>
        <LoadingState title="Loading settings" />
      </View>;
  }

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackAction label="Back" onPress={() => viewModel.back()} />

      <ScreenIntro
        eyebrow="PREFERENCES & STORAGE"
        title="Settings & About"
        subtitle="Manage travel preferences, downloaded guides, and app data."
      />

      {state.error ? <InfoBanner tone="warn" text={state.error} /> : null}

      <View style={[styles.card, shadows.card]}>
        <Text style={styles.sectionEyebrow}>TRAVEL PREFERENCES</Text>
        <Text style={styles.sectionTitle}>Ask LakBai preferences</Text>
        <Text style={styles.aboutText}>
          Used as defaults when you ask LakBai for broad recommendations or a trip idea. Specific requests always take priority.
        </Text>

        <Text style={styles.fieldLabel}>Interests</Text>
        <View style={styles.wrap}>
          {SETTINGS_INTEREST_OPTIONS.map(interest => (
            <ChoiceChip
              key={interest}
              label={interest}
              selected={state.preferences.interests.includes(interest)}
              onPress={() => viewModel.toggleInterest(interest)}
            />
          ))}
        </View>

        <Text style={styles.fieldLabel}>Trip pace</Text>
        <View style={styles.wrap}>
          {SETTINGS_PACE_OPTIONS.map(option => (
            <ChoiceChip
              key={option.key}
              label={option.label}
              selected={state.preferences.pace === option.key}
              onPress={() => viewModel.setPace(option.key)}
            />
          ))}
        </View>

        <PrimaryButton
          label={state.saving ? 'Saving…' : 'Save preferences'}
          icon="checkmark-outline"
          disabled={state.saving}
          onPress={() => void save()}
        />
      </View>

      <View style={[styles.card, shadows.card]}>
        <Text style={styles.sectionEyebrow}>LOCAL STORAGE</Text>
        <Text style={styles.sectionTitle}>What stays on this device</Text>

        <SettingRow
          icon="download-outline"
          title={String(state.savedPackCount) + ' saved ' + (state.savedPackCount === 1 ? 'guide' : 'guides')}
          text={formatSizeKb(state.offlineSizeBytes / 1024) + ' of saved guides and maps on your phone.'}
        />

        <SettingRow
          icon="navigate-outline"
          title="Navigation recovery"
          text={state.navigationRecoveryAvailable
            ? 'A paused itinerary can be resumed.'
            : 'No paused navigation is saved.'}
        >
          {state.navigationRecoveryAvailable ? <SecondaryButton
            label="Clear recovery"
            icon="trash-outline"
            onPress={clearRecovery}
          /> : null}
        </SettingRow>

        <InfoBanner
          tone="info"
          text="Uninstalling LakBai can remove Trips, favorites, preferences, and downloaded guides because they are not synced to an account."
        />
      </View>

      <Disclosure title="Privacy & about LakBai">
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.sectionEyebrow}>PRIVACY & DATA</Text>
          <Text style={styles.sectionTitle}>Your data</Text>
          <SettingRow
            icon="person-outline"
            title="No sign-in required"
            text="Explore, Trips, saved guides, recommendations, and navigation work without a user account."
          />
          <SettingRow
            icon="location-outline"
            title="Location is used when needed"
            text="GPS supports Nearby and navigation. LakBai can still browse local guides without location access."
          />
          <Text style={styles.sectionEyebrow}>ABOUT</Text>
          <Text style={styles.sectionTitle}>LakBai</Text>
          <Text style={styles.aboutText}>
            A tourism and navigation app for Davao del Norte. Ask LakBai uses destination information stored in the app.
          </Text>
          <Text style={styles.version}>Version {APP_VERSION}</Text>
          <View style={styles.attribution}>
            <Text style={styles.attributionTitle}>Map & data attribution</Text>
            <Text style={styles.attributionText}>
              Map data includes contributions from OpenStreetMap. Destination information sources are listed in each guide.
            </Text>
          </View>
        </View>
      </Disclosure>

      <Disclosure title="Advanced">
        <View style={[styles.card, styles.resetCard]}>
          <Text style={styles.sectionEyebrow}>SETUP</Text>
          <Text style={styles.sectionTitle}>Restart personalization</Text>
          <Text style={styles.aboutText}>
            Choose your interests and travel pace again. Finishing setup returns the app to Home.
          </Text>
          <SecondaryButton label="Restart setup" icon="refresh-outline" onPress={restartSetup} />
        </View>
      </Disclosure>
    </ScrollView>;
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
  },
  resetCard: {
    borderColor: '#F0D8CB',
    backgroundColor: '#FFF9F4',
  },
  sectionEyebrow: {
    color: colors.brandOrange,
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
  },
  fieldLabel: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  choice: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceSelected: {
    borderColor: colors.brandForest,
    backgroundColor: colors.brandForest,
  },
  choiceText: {
    color: colors.textSecondary,
    fontSize: 10.5,
    fontWeight: '800',
  },
  choiceTextSelected: {
    color: colors.white,
  },
  settingRow: {
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingCopy: {
    flex: 1,
    gap: 3,
  },
  settingTitle: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '900',
  },
  settingText: {
    color: colors.textSecondary,
    fontSize: 10.8,
    lineHeight: 15,
  },
  aboutText: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 17,
  },
  version: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: '800',
  },
  attribution: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    gap: 3,
  },
  attributionTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  attributionText: {
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15,
  },
  pressed: {
    opacity: 0.75,
  },
});
