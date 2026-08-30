import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DestinationCategory, DestinationPack } from '../data/destinations';
import { colors, radius, spacing } from '../theme';

type Props = {
  pack: DestinationPack;
  compact?: boolean;
  onPress?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
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

export function DestinationCard({
  pack,
  compact = false,
  onPress,
  actionLabel,
  onAction,
  actionDisabled = false,
}: Props) {
  const offlineReady = Boolean(pack.downloaded);
  const available = pack.status === 'available';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, compact && styles.cardCompact, pressed && onPress && styles.pressed]}
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
          {onPress ? <Ionicons name="chevron-forward" size={17} color={colors.muted} /> : null}
        </View>

        {!compact ? <Text numberOfLines={2} style={styles.summary}>{pack.summary}</Text> : null}

        <View style={styles.footer}>
          <View style={styles.metaRow}>
            <Meta icon="location-outline" text={`${pack.spots} spots`} />
            <Meta icon="walk-outline" text={`${pack.trails} trails`} />
            {available ? <Meta icon="archive-outline" text={pack.sizeLabel} /> : null}
          </View>

          <View style={styles.footerActions}>
            <View style={[styles.status, offlineReady ? styles.statusReady : available ? styles.statusAvailable : styles.statusSoon]}>
              <Text style={[styles.statusText, offlineReady ? styles.statusTextReady : available ? styles.statusTextAvailable : styles.statusTextSoon]}>
                {offlineReady ? 'Offline ready' : available ? 'Available' : 'Coming soon'}
              </Text>
            </View>
            {actionLabel && onAction ? (
              <Pressable
                accessibilityRole="button"
                disabled={actionDisabled}
                onPress={onAction}
                style={({ pressed }) => [
                  styles.actionButton,
                  offlineReady && styles.actionButtonRemove,
                  actionDisabled && styles.actionButtonDisabled,
                  pressed && !actionDisabled && styles.actionButtonPressed,
                ]}
              >
                <Ionicons
                  name={offlineReady ? 'trash-outline' : 'download-outline'}
                  size={13}
                  color={offlineReady ? colors.danger : colors.white}
                />
                <Text style={[styles.actionText, offlineReady && styles.actionTextRemove]}>{actionLabel}</Text>
              </Pressable>
            ) : null}
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
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
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
  actionButton: {
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.forest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  actionButtonRemove: {
    borderWidth: 1,
    borderColor: '#E8C5BD',
    backgroundColor: '#FFF7F5',
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonPressed: {
    opacity: 0.72,
  },
  actionText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  actionTextRemove: {
    color: colors.danger,
  },
});
