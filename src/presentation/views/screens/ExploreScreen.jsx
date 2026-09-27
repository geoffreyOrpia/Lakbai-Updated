import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeedback } from "../../../feedback/FeedbackProvider.jsx";
import { AppHeader } from "../components/AppHeader.jsx";
import { CategoryChips } from "../components/CategoryChips.jsx";
import { DestinationCard } from "../components/DestinationCard.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { SearchField } from "../components/SearchField.jsx";
import { SecondaryButton } from "../components/Buttons.jsx";
import { colors, layout, radius, spacing } from "../../../theme.jsx";
const CATEGORY_OPTIONS = [{
  key: 'all',
  label: 'All'
}, {
  key: 'island',
  label: 'Island'
}, {
  key: 'city',
  label: 'City'
}, {
  key: 'nature',
  label: 'Nature'
}, {
  key: 'adventure',
  label: 'Adventure'
}];
export const ExploreScreen = ({
  viewModel,
  onOpenDestination,
  initialQuery = ''
}) => {
  const state = viewModel.state;
  const results = viewModel.results;
  useEffect(() => {
    if (initialQuery) {
      viewModel.setQuery(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);
  const {
    showSnackbar,
    showConfirm
  } = useFeedback();
  if (state.loading && !state.items.length) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader />
        <LoadingState title="Loading the local catalog" text="Reading destination guides stored with LakBai." />
      </ScrollView>;
  }
  if (state.error && !state.items.length) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader />
        <EmptyState icon="alert-circle-outline" title="Explore could not load" text={state.error} actionLabel="Try again" onAction={() => void viewModel.load()} />
      </ScrollView>;
  }
  const performAction = async (destinationName, item) => {
    const result = item.updateAvailable
      ? await viewModel.update(item.destination.id)
      : item.saved
      ? await viewModel.removeFromLibrary(item.destination.id)
      : await viewModel.save(item.destination.id);
    showSnackbar({
      message: result.ok ? result.message.replace('Pack removed', `${destinationName} removed`) : result.message,
      tone: result.ok ? 'success' : 'error'
    });
  };
  const runAction = (destinationName, item) => {
    if (!item.saved || item.updateAvailable) {
      void performAction(destinationName, item);
      return;
    }
    showConfirm({
      title: 'Remove saved pack?',
      message: `${destinationName} will be removed from your local Library and its materialized pack files will be deleted. Favorites and itineraries are kept.`,
      confirmLabel: 'Remove',
      tone: 'danger',
      onConfirm: () => void performAction(destinationName, item)
    });
  };
  const toggleFavorite = async packId => {
    const result = await viewModel.toggleFavorite(packId);
    showSnackbar({
      message: result.message,
      tone: result.ok ? 'success' : 'error'
    });
  };
  const runWebSearch = async () => {
    const result = await viewModel.searchWeb();
    if (!result.ok) {
      showSnackbar({
        message: result.message,
        tone: 'error'
      });
    }
  };
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader />

      <View>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Browse local guides, save packs for offline maps, and keep favorites ready for trip planning.</Text>
      </View>

      <SearchField value={state.query} onChangeText={value => viewModel.setQuery(value)} onSubmit={() => undefined} />
      <CategoryChips options={CATEGORY_OPTIONS} selected={state.category} onSelect={key => viewModel.setCategory(key)} />

      <View style={styles.onlineCard}>
        <View style={styles.onlineHeading}>
          <View style={styles.onlineIcon}>
            <Ionicons name="globe-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.onlineCopy}>
            <Text style={styles.onlineTitle}>Optional web research</Text>
            <Text style={styles.onlineText}>
              Opens a Google search in your browser. Web results stay separate from the local LakBai catalog and are not treated as verified app content.
            </Text>
          </View>
        </View>
        <SecondaryButton
          label={state.onlineSearching ? 'Opening browser…' : 'Open web search'}
          icon="open-outline"
          disabled={state.onlineSearching}
          onPress={() => void runWebSearch()}
        />
        <Text style={styles.onlineHint}>
          {state.query.trim()
            ? `Web query: “${state.query.trim()}” + Davao del Norte tourism`
            : 'No search term entered · opens a general Davao del Norte tourism search.'}
        </Text>
      </View>

      <View style={styles.resultHeader}>
        <Text style={styles.resultCount}>
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </Text>
        <Text style={styles.helper}>Local catalog</Text>
      </View>

      {state.error ? <InfoBanner tone="warn" text={state.error} /> : null}

      <View style={styles.list}>
        {results.map(item => <DestinationCard
          key={item.destination.id}
          item={item}
          onPress={onOpenDestination ? () => onOpenDestination(item.destination.id) : undefined}
          actionLabel={item.destination.status === 'available'
            ? state.busyId === item.destination.id
              ? item.updateAvailable
                ? 'Updating…'
                : item.saved
                ? 'Removing…'
                : 'Saving…'
              : item.updateAvailable
              ? 'Update'
              : item.saved
              ? 'Remove'
              : 'Save'
            : undefined}
          actionDisabled={state.busyId !== null}
          busy={state.busyId === item.destination.id}
          onAction={item.destination.status === 'available' ? () => runAction(item.destination.name, item) : undefined}
          onFavorite={() => void toggleFavorite(item.destination.id)}
          favoriteDisabled={state.busyId !== null}
        />)}
      </View>

      {!results.length && !state.loading ? <EmptyState
        icon="compass-outline"
        title="No local packs match"
        text="Clear the search and category filters to see the full Davao del Norte catalog."
        actionLabel="Clear filters"
        actionIcon="options-outline"
        onAction={() => {
          viewModel.setQuery('');
          viewModel.setCategory('all');
        }}
      /> : null}
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
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  resultCount: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800'
  },
  helper: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: '600'
  },
  list: {
    gap: spacing.sm
  },
  onlineCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySofter,
    padding: spacing.md,
    gap: spacing.sm
  },
  onlineHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm
  },
  onlineIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft
  },
  onlineCopy: {
    flex: 1,
    gap: 3
  },
  onlineTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '900'
  },
  onlineText: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 17
  },
  onlineHint: {
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: 'center'
  }
});
