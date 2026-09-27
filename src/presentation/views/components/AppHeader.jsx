import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from "../../../theme.jsx";

export const AppHeader = () => {
  return <View style={styles.header}>
      <View style={styles.brandRow}>
        <Image source={require('../../../../assets/logo-mark.png')} style={styles.logoMark} resizeMode="contain" />
        <Text style={styles.brandName}>
          Lakbay<Text style={styles.brandAccent}>Lokal</Text>
        </Text>
      </View>

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
    gap: spacing.sm
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: radius.sm
  },
  brandName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.6
  },
  brandAccent: {
    color: colors.primary
  },
  pill: {
    minHeight: 32,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  pillOffline: {
    backgroundColor: colors.primarySofter,
    borderColor: '#CBE6D5'
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: '800'
  },
  pillTextOffline: {
    color: colors.primary
  }
});
