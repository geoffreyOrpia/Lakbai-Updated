import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '../components/AppHeader';
import { CategoryChips, type CategoryKey } from '../components/CategoryChips';
import { DestinationCard } from '../components/DestinationCard';
import { SearchField } from '../components/SearchField';
import { destinationPacks } from '../data/destinations';
import { colors, layout, spacing } from '../theme';

export function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryKey>('all');

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return destinationPacks.filter((pack) => {
      const matchesCategory = category === 'all' || pack.category === category;
      const matchesQuery = !normalized || [pack.name, pack.area, pack.municipality, pack.summary].some((value) => value.toLowerCase().includes(normalized));
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader compact />

      <View>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Find downloadable local destination packs.</Text>
      </View>

      <SearchField value={query} onChangeText={setQuery} />
      <CategoryChips selected={category} onSelect={setCategory} />

      <View style={styles.resultHeader}>
        <Text style={styles.resultCount}>{results.length} {results.length === 1 ? 'result' : 'results'}</Text>
        <Text style={styles.helper}>Davao del Norte</Text>
      </View>

      <View style={styles.list}>
        {results.map((pack) => <DestinationCard key={pack.id} pack={pack} />)}
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
