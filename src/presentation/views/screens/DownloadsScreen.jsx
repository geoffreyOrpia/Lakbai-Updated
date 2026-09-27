import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFeedback } from "../../../feedback/FeedbackProvider.jsx";
import { AppHeader } from "../components/AppHeader.jsx";
import { DestinationCard } from "../components/DestinationCard.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { SectionHeader } from "../components/SectionHeader.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
export const DownloadsScreen = ({
  viewModel
}) => {
  const state = viewModel.state;
  const {
    showSnackbar,
    showConfirm
  } = useFeedback();
  const downloaded = viewModel.downloaded;
  const available = viewModel.available;
  const performAction = async (packId, isDownloaded) => {
    const result = isDownloaded ? await viewModel.remove(packId) : await viewModel.download(packId);
    showSnackbar({
      message: result.message,
      tone: result.ok ? 'success' : 'error'
    });
  };
  const runAction = (destinationName, packId, isDownloaded) => {
    if (!isDownloaded) {
      void performAction(packId, false);
      return;
    }
    showConfirm({
      title: 'Remove from library?',
      message: `${destinationName} will no longer appear in your saved library. The bundled app content remains available.`,
      confirmLabel: 'Remove',
      tone: 'danger',
      onConfirm: () => void performAction(packId, true)
    });
  };
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader />

      <View>
        <Text style={styles.title}>Local Library</Text>
        <Text style={styles.subtitle}>Manage the destination packs you saved on this device.</Text>
      </View>

      <View style={[styles.summaryCard, shadows.card]}>
        <View style={styles.summaryIcon}>
          <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>Offline library</Text>
          <Text style={styles.summaryText}>
            {downloaded.length} {downloaded.length === 1 ? 'pack' : 'packs'} saved to your library
          </Text>
        </View>
        <View style={styles.readyPill}>
          <View style={styles.readyDot} />
          <Text style={styles.readyText}>Offline</Text>
        </View>
      </View>

      {state.error && !state.items.length ? <InfoBanner tone="warn" text={state.error} /> : null}

      <View style={styles.section}>
        <SectionHeader eyebrow="On this device" title="Saved packs" />
        <View style={styles.list}>
          {downloaded.length ? downloaded.map(item => <DestinationCard key={item.destination.id} item={item} showCover={false} actionLabel={state.busyId === item.destination.id ? 'Removing…' : 'Remove'} actionDisabled={state.busyId !== null} onAction={() => void runAction(item.destination.name, item.destination.id, true)} />) : <Text style={styles.emptyText}>No destination packs are currently saved on this device.</Text>}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Built into the app" title="Available to save" />
        <View style={styles.list}>
          {available.length ? available.map(item => <DestinationCard key={item.destination.id} item={item} showCover={false} actionLabel={state.busyId === item.destination.id ? 'Saving…' : 'Save'} actionDisabled={state.busyId !== null} onAction={() => void runAction(item.destination.name, item.destination.id, false)} />) : <Text style={styles.emptyText}>All currently available packs are saved offline.</Text>}
        </View>
      </View>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={17} color={colors.muted} />
        <Text style={styles.noteText}>
          Every pack is already bundled with LakbayLokal. Saving one bookmarks it in your local library and enables its verified offline features; it does not download another copy or free app storage when removed.
        </Text>
      </View>
    </ScrollView>;
};
const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: 128,
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
  summaryCard: {
    minHeight: 74,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#CBE6D5',
    backgroundColor: colors.primarySofter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center'
  },
  summaryCopy: {
    flex: 1
  },
  summaryTitle: {
    color: colors.primaryDark,
    fontSize: 13.5,
    fontWeight: '800'
  },
  summaryText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11.3
  },
  readyPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary
  },
  readyText: {
    color: colors.primary,
    fontSize: 9.5,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  section: {
    gap: spacing.sm
  },
  list: {
    gap: spacing.sm
  },
  emptyText: {
    paddingVertical: spacing.md,
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 16
  },
  note: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted
  },
  noteText: {
    flex: 1,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16
  }
});
