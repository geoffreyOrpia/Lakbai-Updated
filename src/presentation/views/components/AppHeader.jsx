import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from "../../../theme.jsx";
import { BrandLockup } from "./BrandMark.jsx";

export const AppHeader = () => {
  return <View style={styles.header}>
      <BrandLockup markSize={34} compact />

      <View
        accessibilityLabel="Offline-first app. Saved travel data stays on this device."
        style={[styles.pill, styles.pillOffline]}
      >
        <Ionicons name="cloud-offline-outline" size={13} color={colors.primary} />
        <Text style={[styles.pillText, styles.pillTextOffline]}>Offline-first</Text>
      </View>
    </View>;
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pill: {
    minHeight: 32,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pillOffline: {
    backgroundColor: colors.primarySofter,
    borderColor: '#CBE6D5',
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  pillTextOffline: {
    color: colors.primary,
  },
});
