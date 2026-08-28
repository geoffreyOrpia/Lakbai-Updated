import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DestinationCategory, DestinationPack } from '../data/destinations';
import { colors, radius, spacing } from '../theme';

type Props = {
  pack: DestinationPack;
  compact?: boolean;
  onPress?: () => void;
};

function categoryIcon(category: DestinationCategory) {
  switch (category) {
    case 'island':
      return 'water-outline' as const;
    case 'city':
      return 'business-outline' as const;
    case 'nature':
      return 'leaf-outline' as const;
    case 'adventure':
      return 'trail-sign-outline' as const;
  }
}

export function DestinationCard({ pack, compact = false, onPress }: Props) {
  const offlineReady = Boolean(pack.downloaded);
  const available = pack.status === 'available';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, compact && styles.cardCompact, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, offlineReady && styles.iconWrapReady]}>
        <Ionicons name={categoryIcon(pack.category)} size={22} color={colors.forest} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text numberOfLines={1} style={styles.title}>{pack.name}</Text>
            <Text numberOfLines={1} style={styles.area}>{pack.area}</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.muted} />
        </View>

        {!compact ? <Text numberOfLines={2} style={styles.summary}>{pack.summary}</Text> : null}

        <View style={styles.footer}>
          <View style={styles.metaRow}>
            <Meta icon="location-outline" text={`${pack.spots} spots`} />
            <Meta icon="walk-outline" text={`${pack.trails} trails`} />
            {available ? <Meta icon="archive-outline" text={pack.sizeLabel} /> : null}
          </View>

          <View style={[styles.status, offlineReady ? styles.statusReady : available ? styles.statusAvailable : styles.statusSoon]}>
            <Text style={[styles.statusText, offlineReady ? styles.statusTextReady : available ? styles.statusTextAvailable : styles.statusTextSoon]}>
              {offlineReady ? 'Offline ready' : available ? 'Available' : 'Coming soon'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

type MetaProps = {
  icon: 'location-outline' | 'walk-outline' | 'archive-outline';
  text: string;
};

function Meta({ icon, text }: MetaProps) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={12} color={colors.muted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 112,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardCompact: {
    minHeight: 92,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.995 }],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.softOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapReady: {
    backgroundColor: colors.softGreen,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  titleCopy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 15.5,
    lineHeight: 19,
    fontWeight: '800',
  },
  area: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11.2,
    lineHeight: 14,
    fontWeight: '600',
  },
  summary: {
    color: colors.muted,
    fontSize: 12.2,
    lineHeight: 17,
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: '600',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  statusReady: {
    backgroundColor: colors.softGreen,
  },
  statusAvailable: {
    backgroundColor: colors.softOrange,
  },
  statusSoon: {
    backgroundColor: '#F0EEE9',
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  statusTextReady: {
    color: colors.forest,
  },
  statusTextAvailable: {
    color: '#A95E14',
  },
  statusTextSoon: {
    color: colors.muted,
  },
});
