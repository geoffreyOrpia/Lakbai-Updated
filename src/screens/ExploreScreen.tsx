import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '../components/AppHeader';
import { CategoryChips, type CategoryKey } from '../components/CategoryChips';
import { DestinationCard } from '../components/DestinationCard';
import { SearchField } from '../components/SearchField';
import type { DestinationPack } from '../data/destinations';
import { useFeedback } from '../feedback/FeedbackProvider';
import { colors, layout, spacing } from '../theme';

type Props = {
  initialQuery?: string;
  packs: DestinationPack[];
  onDownloadPack: (packId: string) => Promise<void>;
  onRemovePack: (packId: string) => Promise<void>;
};

export function ExploreScreen({ initialQuery = '', packs, onDownloadPack, onRemovePack }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<CategoryKey>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const { showSnackbar } = useFeedback();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return packs.filter((pack) => {
      const matchesCategory = category === 'all' || pack.category === category;
      const matchesQuery = !normalized || [pack.name, pack.area, pack.municipality, pack.summary].some((value) => value.toLowerCase().includes(normalized));
      return matchesCategory && matchesQuery;
    });
  }, [category, packs, query]);

  const runDownloadAction = async (pack: DestinationPack) => {
    setBusyId(pack.id);
    try {
      if (pack.downloaded) {
        await onRemovePack(pack.id);
        showSnackbar({ message: `${pack.name} removed from offline downloads.`, tone: 'info' });
      } else {
        await onDownloadPack(pack.id);
        showSnackbar({ message: `${pack.name} is ready for offline use.`, tone: 'success' });
      }
    } catch {
      showSnackbar({ message: 'The destination pack could not be updated. Please try again.', tone: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader compact />

      <View>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Find and save local destination packs for offline use.</Text>
      </View>

      <SearchField value={query} onChangeText={setQuery} />
      <CategoryChips selected={category} onSelect={setCategory} />

      <View style={styles.resultHeader}>
        <Text style={styles.resultCount}>{results.length} {results.length === 1 ? 'result' : 'results'}</Text>
        <Text style={styles.helper}>Davao del Norte</Text>
      </View>

      <View style={styles.list}>
        {results.map((pack) => (
          <DestinationCard
            key={pack.id}
            pack={pack}
            actionLabel={pack.status === 'available' ? (busyId === pack.id ? 'Updating…' : pack.downloaded ? 'Remove' : 'Download') : undefined}
            actionDisabled={busyId !== null}
            onAction={pack.status === 'available' ? () => void runDownloadAction(pack) : undefined}
          />
        ))}
      </View>

      {!results.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No packs found</Text>
          <Text style={styles.emptyText}>Try another destination name or category.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  subtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12.5,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCount: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  helper: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: '600',
  },
  list: {
    gap: spacing.sm,
  },
  empty: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
  },
});
