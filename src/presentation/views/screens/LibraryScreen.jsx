import { ScreenScrollView as ScrollView } from "../components/ScreenScrollView.jsx";
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useFeedback } from "../../../feedback/FeedbackProvider.jsx";
import { AppHeader } from "../components/AppHeader.jsx";
import { DestinationCard } from "../components/DestinationCard.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { SectionHeader } from "../components/SectionHeader.jsx";
import { SecondaryButton } from "../components/Buttons.jsx";
import { ScreenIntro } from "../components/ScreenIntro.jsx";
import { colors, layout, radius, spacing } from "../../../theme.jsx";
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
  const [favoriteLimit, setFavoriteLimit] = useState(6);
  const [savedLimit, setSavedLimit] = useState(6);
  if (state.loading && !state.items.length) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader onOpenSettings={onOpenSettings} />
        <LoadingState title="Loading saved places" />
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
        subtitle="Favorites mark places you like; downloaded guides keep maps and destination information available without internet."
      />

      {state.error ? <InfoBanner tone="warn" text={state.error} /> : null}

      <View style={styles.section}>
        <SectionHeader eyebrow="For future trips" title="Favorites" />
        <View style={styles.list}>
          {favorites.length ? favorites.slice(0, favoriteLimit).map(item => <DestinationCard
            key={item.destination.id}
            item={item}
            showCover={false}
            onPress={() => onOpenDestination?.(item.destination.id)}
            onFavorite={() => void toggleFavorite(item.destination.id)}
            favoriteDisabled={state.busyId !== null}
          />) : <Text style={styles.emptyText}>No favorites yet. Use the heart on Explore or a destination guide.</Text>}
          {favorites.length > favoriteLimit ? <SecondaryButton
            label="Show more favorites"
            icon="chevron-down-outline"
            onPress={() => setFavoriteLimit(value => value + 6)}
          /> : null}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="On this device" title="Available offline" />
        <View style={styles.list}>
          {saved.length ? saved.slice(0, savedLimit).map(item => <DestinationCard
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
          {saved.length > savedLimit ? <SecondaryButton
            label="Show more offline guides"
            icon="chevron-down-outline"
            onPress={() => setSavedLimit(value => value + 6)}
          /> : null}
        </View>
      </View>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={17} color={colors.muted} />
        <Text style={styles.noteText}>
          Removing a downloaded guide does not remove it from Favorites or Trips.
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
