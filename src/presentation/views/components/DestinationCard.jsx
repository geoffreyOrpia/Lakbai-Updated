import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing } from "../../../theme.jsx";
import { formatSizeKb } from "../../../core/utils/format.jsx";
import { CoverArt } from "./CoverArt.jsx";
export const DestinationCard = ({
  item,
  onPress,
  actionLabel,
  onAction,
  actionDisabled = false,
  busy = false,
  showCover = true,
  onFavorite,
  favoriteDisabled = false
}) => {
  const {
    destination,
    saved,
    favorite,
    updateAvailable
  } = item;
  const available = destination.status === 'available';
  const removing = actionLabel === 'Remove';
  return <Pressable accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={onPress ? `Open ${destination.name}` : undefined} onPress={onPress} disabled={!onPress} style={({
    pressed
  }) => [styles.card, pressed && onPress && styles.pressed]}>
      {showCover ? <CoverArt theme={destination.coverTheme} photoKey={destination.photos?.[0]?.key} height={104} radius={radius.md - 2} /> : null}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text numberOfLines={1} style={styles.title}>
              {destination.name}
            </Text>
            <Text numberOfLines={1} style={styles.area}>
              {destination.area}
            </Text>
          </View>
          {onFavorite ? <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: favorite, disabled: favoriteDisabled }}
              accessibilityLabel={favorite ? `Remove ${destination.name} from Favorites` : `Add ${destination.name} to Favorites`}
              disabled={favoriteDisabled}
              hitSlop={8}
              onPress={event => {
                event.stopPropagation?.();
                onFavorite();
              }}
              style={({ pressed }) => [styles.favoriteAction, favoriteDisabled && styles.actionButtonDisabled, pressed && styles.actionButtonPressed]}
            >
              <Ionicons name={favorite ? "heart" : "heart-outline"} size={18} color={favorite ? colors.danger : colors.primary} />
            </Pressable> : favorite ? <Ionicons accessibilityLabel="Favorite destination" name="heart" size={16} color={colors.danger} /> : null}
          {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.faint} /> : null}
        </View>

        {!showCover ? <Text numberOfLines={2} style={styles.summary}>
            {destination.summary}
          </Text> : null}

        <View style={styles.metaRow}>
          {destination.spotsCount != null ? <Meta icon="location-outline" text={`${destination.spotsCount} spots`} /> : null}
          {destination.trailsCount != null ? <Meta icon="walk-outline" text={`${destination.trailsCount} ${destination.trailsCount === 1 ? 'trail' : 'trails'}`} /> : null}
          {available ? <Meta icon="archive-outline" text={formatSizeKb(destination.sizeKb)} /> : null}
        </View>

        <View style={styles.footer}>
          <View style={[styles.status, saved ? styles.statusReady : available ? styles.statusAvailable : styles.statusSoon]}>
            <Text style={[styles.statusText, saved ? styles.statusTextReady : available ? styles.statusTextAvailable : styles.statusTextSoon]}>
              {updateAvailable ? 'Update available' : saved ? 'Offline ready' : available ? 'Available' : 'Coming soon'}
            </Text>
          </View>

          {actionLabel && onAction ? <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${actionLabel} ${destination.name}`}
            accessibilityState={{ disabled: actionDisabled, busy }}
            disabled={actionDisabled}
            onPress={event => { event.stopPropagation?.(); onAction(); }}
            style={({
          pressed
        }) => [styles.actionButton, removing && styles.actionButtonRemove, actionDisabled && styles.actionButtonDisabled, pressed && !actionDisabled && styles.actionButtonPressed]}>
              <Ionicons name={busy ? 'hourglass-outline' : updateAvailable ? 'refresh-outline' : removing ? 'trash-outline' : saved ? 'arrow-forward-outline' : 'download-outline'} size={13} color={removing ? colors.danger : colors.onPrimary} />
              <Text style={[styles.actionText, removing && styles.actionTextRemove]}>{actionLabel}</Text>
            </Pressable> : null}
        </View>
      </View>
    </Pressable>;
};
const Meta = ({
  icon,
  text
}) => {
  return <View style={styles.meta}>
      <Ionicons name={icon} size={12} color={colors.muted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>;
};
const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.sm + 2,
    gap: spacing.sm,
    ...shadows.card
  },
  pressed: {
    transform: [{
      scale: 0.99
    }],
    opacity: 0.92
  },
  body: {
    gap: spacing.xs
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  titleCopy: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 15.5,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.2
  },
  favoriteAction: {
    width: 40,
    height: 40,
    marginVertical: -10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill
  },
  area: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11.2,
    lineHeight: 15,
    fontWeight: '600'
  },
  summary: {
    color: colors.muted,
    fontSize: 12.2,
    lineHeight: 17
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  metaText: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: '600'
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  status: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill
  },
  statusReady: {
    backgroundColor: colors.primarySofter
  },
  statusAvailable: {
    backgroundColor: colors.accentSoft
  },
  statusSoon: {
    backgroundColor: colors.surfaceSunken
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  statusTextReady: {
    color: colors.primary
  },
  statusTextAvailable: {
    color: colors.accentDark
  },
  statusTextSoon: {
    color: colors.muted
  },
  actionButton: {
    minHeight: 44,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5
  },
  actionButtonRemove: {
    borderWidth: 1,
    borderColor: '#F2CFCF',
    backgroundColor: colors.dangerSoft
  },
  actionButtonDisabled: {
    opacity: 0.45
  },
  actionButtonPressed: {
    opacity: 0.72
  },
  actionText: {
    color: colors.onPrimary,
    fontSize: 10.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  actionTextRemove: {
    color: colors.danger
  }
});
