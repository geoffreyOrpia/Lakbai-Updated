import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, layout, shadows, spacing } from "../../../theme.jsx";
const items = [{
  key: 'home',
  label: 'Home',
  icon: 'home-outline',
  activeIcon: 'home'
}, {
  key: 'explore',
  label: 'Explore',
  icon: 'compass-outline',
  activeIcon: 'compass'
}, {
  key: 'trips',
  label: 'Trips',
  icon: 'calendar-outline',
  activeIcon: 'calendar'
}, {
  key: 'library',
  label: 'Saved',
  icon: 'bookmark-outline',
  activeIcon: 'bookmark'
}, {
  key: 'safety',
  label: 'Safety',
  icon: 'shield-checkmark-outline',
  activeIcon: 'shield-checkmark'
}];
/** Floating white pill tab bar. */
export const BottomNav = ({
  active,
  onChange
}) => {
  return <View pointerEvents="box-none" style={styles.wrap}>
      <View style={[styles.bar, shadows.floating]}>
        {items.map(item => {
        const isActive = active === item.key;
        return <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{
          selected: isActive
        }} accessibilityLabel={`${item.label} tab`} onPress={() => onChange(item.key)} style={({
          pressed
        }) => [styles.item, pressed && styles.pressed]}>
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Ionicons name={isActive ? item.activeIcon : item.icon} size={19} color={isActive ? colors.onPrimary : colors.muted} />
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>;
      })}
      </View>
    </View>;
};
const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm + 2
  },
  bar: {
    width: '100%',
    maxWidth: 560,
    minHeight: layout.tabBarHeight,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  item: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3
  },
  iconWrap: {
    width: 34,
    height: 26,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconWrapActive: {
    backgroundColor: colors.primary
  },
  label: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700'
  },
  labelActive: {
    color: colors.text,
    fontWeight: '900'
  },
  pressed: {
    opacity: 0.7
  }
});
