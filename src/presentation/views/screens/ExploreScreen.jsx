import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeedback } from "../../../feedback/FeedbackProvider.jsx";
import { AppHeader } from "../components/AppHeader.jsx";
import { CategoryChips } from "../components/CategoryChips.jsx";
import { DestinationCard } from "../components/DestinationCard.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
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
    showSnackbar
  } = useFeedback();
  const runAction = async (destinationName, packId, downloaded) => {
    const result = downloaded ? await viewModel.remove(packId) : await viewModel.download(packId);
    showSnackbar({
      message: result.ok ? result.message.replace('Pack removed', `${destinationName} removed`) : result.message,
      tone: result.ok ? 'success' : 'error'
    });
  };
  const runOnlineResearch = async () => {
    const result = await viewModel.searchOnline();
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
        <Text style={styles.subtitle}>Browse Davao del Norte guides, photos, and travel notes stored on your device.</Text>
      </View>

      <SearchField value={state.query} onChangeText={value => viewModel.setQuery(value)} onSubmit={() => undefined} />
      <CategoryChips options={CATEGORY_OPTIONS} selected={state.category} onSelect={key => viewModel.setCategory(key)} />

      <View style={styles.onlineCard}>
        <View style={styles.onlineHeading}>
          <View style={styles.onlineIcon}>
            <Ionicons name="globe-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.onlineCopy}>
            <Text style={styles.onlineTitle}>Research Davao del Norte online</Text>
            <Text style={styles.onlineText}>
              Search live web results for places within the province using Wi-Fi or mobile data. LakbayLokal stays offline-first.
            </Text>
          </View>
        </View>
        <SecondaryButton
          label={state.onlineSearching ? 'Opening browser…' : 'Search the internet'}
          icon="open-outline"
          disabled={state.onlineSearching}
          onPress={() => void runOnlineResearch()}
        />
        <Text style={styles.onlineHint}>
          {state.query.trim()
            ? `Searching for “${state.query.trim()}” in Davao del Norte`
            : 'Tip: enter a place or activity above before searching.'}
        </Text>
      </View>

      <View style={styles.resultHeader}>
        <Text style={styles.resultCount}>
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </Text>
        <Text style={styles.helper}>Stored on device</Text>
      </View>

      {state.error && !state.items.length ? <InfoBanner tone="warn" text={state.error} /> : null}

      <View style={styles.list}>
        {results.map(item => <DestinationCard key={item.destination.id} item={item} onPress={onOpenDestination ? () => onOpenDestination(item.destination.id) : undefined} actionLabel={item.destination.status === 'available' ? state.busyId === item.destination.id ? 'Saving…' : item.downloaded ? 'Remove' : item.updateAvailable ? 'Update' : 'Save' : undefined} actionDisabled={state.busyId !== null} onAction={item.destination.status === 'available' ? () => void runAction(item.destination.name, item.destination.id, item.downloaded) : undefined} />)}
      </View>

      {!results.length && !state.loading ? <EmptyState icon="compass-outline" title="No packs found" text="Try another destination name or category." /> : null}
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
