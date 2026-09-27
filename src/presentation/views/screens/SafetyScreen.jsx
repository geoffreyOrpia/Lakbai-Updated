import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFeedback } from "../../../feedback/FeedbackProvider.jsx";
import { AppHeader } from "../components/AppHeader.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { SectionHeader } from "../components/SectionHeader.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
export const SafetyScreen = ({
  viewModel
}) => {
  const state = viewModel.state;
  const {
    showSnackbar,
    showToast,
    showConfirm
  } = useFeedback();
  const completedCount = state.completed.length;
  const toggleItem = async (itemKey, label) => {
    const wasCompleted = state.completed.includes(itemKey);
    const saved = await viewModel.toggle(itemKey);
    if (saved) {
      showToast(wasCompleted ? `${label} reopened.` : `${label} marked ready.`, wasCompleted ? 'info' : 'success', 1700);
    } else {
      showSnackbar({
        message: 'The checklist change could not be saved.',
        tone: 'error'
      });
    }
  };
  const resetChecklist = async () => {
    try {
      await viewModel.reset();
      showSnackbar({
        message: 'Safety checklist reset.',
        tone: 'success'
      });
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : 'The checklist could not be reset.',
        tone: 'error'
      });
    }
  };
  const confirmResetChecklist = () => {
    showConfirm({
      title: 'Reset safety checklist?',
      message: 'All completed checklist items will be marked unfinished on this device.',
      confirmLabel: 'Reset',
      tone: 'danger',
      onConfirm: () => void resetChecklist()
    });
  };
  const callContact = async contact => {
    const result = await viewModel.callContact(contact);
    if (!result.ok) {
      showSnackbar({
        message: result.message,
        tone: 'error'
      });
    }
  };
  if (state.loading && !state.checklist.length) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader />
        <LoadingState title="Preparing Safety" text="Loading your checklist and verified contacts from saved destination packs." />
      </ScrollView>;
  }
  if (state.error && !state.checklist.length) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader />
        <EmptyState icon="alert-circle-outline" title="Safety could not load" text={state.error} actionLabel="Try again" onAction={() => void viewModel.load()} />
      </ScrollView>;
  }
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader />

      <View>
        <Text style={styles.title}>Safety</Text>
        <Text style={styles.subtitle}>Offline travel preparation and essential local guidance.</Text>
      </View>

      <View style={[styles.emergencyCard, shadows.card]}>
        <View style={styles.emergencyIcon}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.danger} />
        </View>
        <View style={styles.emergencyCopy}>
          <Text style={styles.emergencyTitle}>Emergency information</Text>
          <Text style={styles.emergencyText}>
            Verified emergency contacts from saved packs appear below. Nationwide 911 still requires available cellular service.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Before leaving" title={state.loading ? 'Loading checklist…' : `${completedCount}/${state.checklist.length} ready`} actionLabel={completedCount ? 'Reset' : undefined} onAction={completedCount ? confirmResetChecklist : undefined} />
        <View style={[styles.checklistCard, shadows.card]}>
          {state.checklist.map((item, index) => {
          const checked = state.completed.includes(item.key);
          return <Pressable key={item.key} accessibilityRole="checkbox" accessibilityState={{
            checked
          }} onPress={() => void toggleItem(item.key, item.label)} style={({
            pressed
          }) => [styles.checkRow, index < state.checklist.length - 1 && styles.checkRowBorder, checked && styles.checkRowCompleted, pressed && styles.pressed]}>
                <View style={[styles.checkIcon, checked && styles.checkIconCompleted]}>
                  <Ionicons name={item.icon} size={17} color={colors.primary} />
                </View>
                <Text style={[styles.checkText, checked && styles.checkTextCompleted]}>{item.label}</Text>
                <Ionicons name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={checked ? colors.primary : colors.faint} />
              </Pressable>;
        })}
        </View>
        <Text style={styles.checklistHint}>Tap each item as you complete it. Your checklist is saved on this device.</Text>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Saved offline" title="Emergency contacts from your packs" />
        {state.contacts.length ? <View style={styles.list}>
            {state.contacts.map(contact => <View key={`${contact.packName}-${contact.label}`} style={[styles.contactCard, shadows.soft]}>
                <View style={styles.contactIcon}>
                  <Ionicons name="call-outline" size={17} color={colors.danger} />
                </View>
                <View style={styles.contactCopy}>
                  <Text style={styles.contactLabel}>{contact.label}</Text>
                  <Text style={styles.contactMeta}>
                    {contact.phone}
                    {contact.note ? ` · ${contact.note}` : ''}
                  </Text>
                  <Text style={styles.contactSource}>{contact.verified ? `Verified · ${contact.sourceLabel}` : `From ${contact.packName}`}</Text>
                </View>
                {contact.verified ? <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${contact.label} at ${contact.phone}`}
                  onPress={() => void callContact(contact)}
                  style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
                >
                    <Ionicons name="call" size={15} color={colors.onPrimary} />
                    <Text style={styles.callButtonText}>Call</Text>
                  </Pressable> : null}
              </View>)}
          </View> : <EmptyState icon="call-outline" title="No pack contacts yet" text="Save a destination pack to your library to include its local emergency numbers here." />}
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Essentials" title="Travel readiness" />
        <View style={styles.grid}>
          <SafetyTile icon="medical-outline" title="Medical" text="Nearest known facilities" />
          <SafetyTile icon="call-outline" title="Contacts" text="Local emergency numbers" />
          <SafetyTile icon="navigate-outline" title="Route" text="Saved trail references" />
          <SafetyTile icon="information-circle-outline" title="Advisories" text="Destination reminders" />
        </View>
      </View>

      <View style={styles.guidance}>
        <Ionicons name="compass-outline" size={18} color={colors.accent} />
        <Text style={styles.guidanceText}>
          LakbayLokal supports preparation and navigation but does not replace local guides, official advisories, or emergency services.
        </Text>
      </View>
    </ScrollView>;
};
const SafetyTile = ({
  icon,
  title,
  text
}) => {
  return <View style={[styles.tile, shadows.soft]}>
      <Ionicons name={icon} size={19} color={colors.primary} />
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileText}>{text}</Text>
    </View>;
};
const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: layout.tabContentBottom,
    gap: spacing.lg
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.55
  },
  subtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12.5
  },
  emergencyCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F2CFCF',
    backgroundColor: colors.dangerSoft,
    flexDirection: 'row',
    gap: spacing.sm
  },
  emergencyIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emergencyCopy: {
    flex: 1
  },
  emergencyTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '800'
  },
  emergencyText: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 11.2,
    lineHeight: 16
  },
  section: {
    gap: spacing.sm
  },
  checklistCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    overflow: 'hidden'
  },
  checkRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  checkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  checkRowCompleted: {
    backgroundColor: colors.primarySofter
  },
  checkIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkIconCompleted: {
    backgroundColor: colors.white
  },
  checkText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700'
  },
  checkTextCompleted: {
    color: colors.primaryDark
  },
  checklistHint: {
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15
  },
  list: {
    gap: spacing.sm
  },
  contactCard: {
    minHeight: 68,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  contactCopy: {
    flex: 1
  },
  contactLabel: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '800'
  },
  contactMeta: {
    marginTop: 1,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700'
  },
  contactSource: {
    marginTop: 1,
    color: colors.faint,
    fontSize: 9.8,
    fontWeight: '600'
  },
  callButton: {
    minWidth: 64,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs
  },
  callButtonText: {
    color: colors.onPrimary,
    fontSize: 10.5,
    fontWeight: '900'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  tile: {
    flexGrow: 1,
    minWidth: '46%',
    minHeight: 92,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white
  },
  tileTitle: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '800'
  },
  tileText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 14
  },
  guidance: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    flexDirection: 'row',
    gap: spacing.xs
  },
  guidanceText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16
  },
  pressed: {
    opacity: 0.72
  }
});
