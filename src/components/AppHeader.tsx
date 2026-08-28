import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

type Props = {
  compact?: boolean;
};

export function AppHeader({ compact = false }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={[styles.logoMark, compact && styles.logoMarkCompact]}>
          <Ionicons name="navigate" size={compact ? 17 : 19} color={colors.white} />
        </View>
        <View>
          <Text style={[styles.brandName, compact && styles.brandNameCompact]}>
            Lakbay<Text style={styles.brandAccent}>Lokal</Text>
          </Text>
          {!compact ? <Text style={styles.tagline}>Go Beyond, Go Lokal.</Text> : null}
        </View>
      </View>

      <View style={styles.offlinePill}>
        <Ionicons name="cloud-offline-outline" size={14} color={colors.forest} />
        <Text style={styles.offlineText}>Offline ready</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.forest,
  },
  logoMarkCompact: {
    width: 34,
    height: 34,
  },
  brandName: {
    color: colors.forest,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  brandNameCompact: {
    fontSize: 19,
  },
  brandAccent: {
    color: colors.orange,
  },
  tagline: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: '600',
  },
  offlinePill: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.softGreen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  offlineText: {
    color: colors.forest,
    fontSize: 10.5,
    fontWeight: '800',
  },
});
