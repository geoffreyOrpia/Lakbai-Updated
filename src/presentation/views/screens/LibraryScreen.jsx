import { ScreenScrollView as ScrollView } from "../components/ScreenScrollView.jsx";
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useFeedback } from "../../../feedback/FeedbackProvider.jsx";
import { AppHeader } from "../components/AppHeader.jsx";
import { DestinationCard } from "../components/DestinationCard.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { SectionHeader } from "../components/SectionHeader.jsx";
import { ScreenIntro } from "../components/ScreenIntro.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
import { formatSizeKb } from "../../../core/utils/format.jsx";
export const LibraryScreen = ({
  viewModel,
  onOpenDestination,
  onOpenSettings
}) => {
  const state = viewModel.state;
  const {
    showSnackbar
  } = useFeedback();
  const saved = viewModel.saved;
  const favorites = viewModel.favorites;
  const available = viewModel.available;
  if (state.loading && !state.items.length) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader onOpenSettings={onOpenSettings} />
        <LoadingState title="Opening Saved places" text="Opening your saved places." />
      </ScrollView>;
  }
  if (state.error && !state.items.length) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader onOpenSettings={onOpenSettings} />
        <EmptyState icon="alert-circle-outline" title="Saved places could not load" text={state.error} actionLabel="Try again" onAction={() => void viewModel.load()} />
      </ScrollView>;
  }
  const runAction = async item => {
    const result = item.updateAvailable
      ? await viewModel.update(item.destination.id)
      : await viewModel.save(item.destination.id);
    showSnackbar({ message: result.message, tone: result.ok ? 'success' : 'error' });
  };
  const toggleFavorite = async packId => {
    const result = await viewModel.toggleFavorite(packId);
    showSnackbar({
      message: result.message,
      tone: result.ok ? 'success' : 'error'
    });
  };
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader onOpenSettings={onOpenSettings} />

      <ScreenIntro
        eyebrow="ON THIS DEVICE"
        title="Saved places"
        subtitle="Favorites bookmark places you like. Save a guide and map for offline use."
      />

      <View style={[styles.summaryCard, shadows.card]}>
        <View style={styles.summaryIcon}>
          <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>Offline saved places</Text>
          <Text style={styles.summaryText}>
            {saved.length} {saved.length === 1 ? 'guide' : 'guides'} · {formatSizeKb(viewModel.totalOfflineSizeBytes / 1024)} on your phone
          </Text>
        </View>
        <View style={styles.readyPill}>
          <View style={styles.readyDot} />
          <Text style={styles.readyText}>Ready offline</Text>
        </View>
      </View>

      {state.error ? <InfoBanner tone="warn" text={state.error} /> : null}

      <View style={styles.section}>
        <SectionHeader eyebrow="For future trips" title="Favorites" />
        <View style={styles.list}>
          {favorites.length ? favorites.map(item => <DestinationCard
            key={item.destination.id}
            item={item}
            showCover={false}
            onPress={() => onOpenDestination?.(item.destination.id)}
            onFavorite={() => void toggleFavorite(item.destination.id)}
            favoriteDisabled={state.busyId !== null}
          />) : <Text style={styles.emptyText}>No favorites yet. Use the heart on Explore or a destination guide.</Text>}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="On this device" title="Available offline" />
        <View style={styles.list}>
          {saved.length ? saved.map(item => <DestinationCard
            key={item.destination.id}
            item={item}
            showCover={false}
            onPress={() => onOpenDestination?.(item.destination.id)}
            actionLabel={state.busyId === item.destination.id ? item.updateAvailable ? 'Updating…' : 'Saving…' : item.updateAvailable ? 'Update' : 'Open guide'}
            actionDisabled={state.busyId !== null}
            busy={state.busyId === item.destination.id}
            onAction={() => item.saved && !item.updateAvailable ? onOpenDestination?.(item.destination.id) : runAction(item)}
            onFavorite={() => void toggleFavorite(item.destination.id)}
            favoriteDisabled={state.busyId !== null}
          />) : <Text style={styles.emptyText}>No guides saved yet. Open a place in Explore to save it for offline use.</Text>}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Built into the app" title="Available to save" />
        <View style={styles.list}>
          {available.length ? available.map(item => <DestinationCard
            key={item.destination.id}
            item={item}
            showCover={false}
            onPress={() => onOpenDestination?.(item.destination.id)}
            actionLabel={state.busyId === item.destination.id ? 'Saving…' : 'Save offline'}
            actionDisabled={state.busyId !== null}
            busy={state.busyId === item.destination.id}
            onAction={() => item.saved && !item.updateAvailable ? onOpenDestination?.(item.destination.id) : runAction(item)}
            onFavorite={() => void toggleFavorite(item.destination.id)}
            favoriteDisabled={state.busyId !== null}
          />) : <Text style={styles.emptyText}>All available guides are saved offline.</Text>}
        </View>
      </View>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={17} color={colors.muted} />
        <Text style={styles.noteText}>
          Saved guides and maps work without internet. Removing an offline copy keeps your favorites and trips.
        </Text>
      </View>
    </ScrollView>;
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
