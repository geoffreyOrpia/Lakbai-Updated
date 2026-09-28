import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from "../../../theme.jsx";

export const AppHeader = ({ onOpenSettings }) => {
  return <View style={styles.header}>
      <Image
        source={require('../../../../assets/lakbai-lockup.png')}
        style={styles.brandLockup}
        resizeMode="contain"
        accessibilityLabel="LakBai. Explore Davao del Norte."
      />

      <View style={styles.actions}>
        <View
          accessibilityLabel="Offline-first app. Saved travel data stays on this device."
          style={[styles.pill, styles.pillOffline]}
        >
          <Ionicons name="cloud-offline-outline" size={13} color={colors.primary} />
          <Text style={[styles.pillText, styles.pillTextOffline]}>Offline</Text>
        </View>
        {onOpenSettings ? <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings and about"
          onPress={onOpenSettings}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
        >
          <Ionicons name="settings-outline" size={19} color={colors.brandForest} />
        </Pressable> : null}
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
  brandLockup: {
    width: 168,
    height: 50,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pill: {
    minHeight: 32,
    paddingHorizontal: 10,
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
    fontSize: 10,
    fontWeight: '800',
  },
  pillTextOffline: {
    color: colors.primary,
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
