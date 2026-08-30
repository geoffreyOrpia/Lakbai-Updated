import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, spacing } from '../theme';
import type { TabKey } from '../types/navigation';

type IconName = ComponentProps<typeof Ionicons>['name'];

type NavItem = {
  key: TabKey;
  label: string;
  icon: IconName;
  activeIcon: IconName;
};

const items: NavItem[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { key: 'explore', label: 'Explore', icon: 'compass-outline', activeIcon: 'compass' },
  { key: 'trips', label: 'Trips', icon: 'calendar-outline', activeIcon: 'calendar' },
  { key: 'downloads', label: 'Downloads', icon: 'download-outline', activeIcon: 'download' },
  { key: 'safety', label: 'Safety', icon: 'shield-checkmark-outline', activeIcon: 'shield-checkmark' },
];

type Props = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
};

export function BottomNav({ active, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {items.map((item) => {
        const isActive = active === item.key;
        const isPrimaryTrips = item.key === 'trips';
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={[
              styles.iconWrap,
              isActive && styles.iconWrapActive,
              isActive && isPrimaryTrips && styles.iconWrapTripsActive,
            ]}>
              <Ionicons
                name={isActive ? item.activeIcon : item.icon}
                size={20}
                color={isActive && isPrimaryTrips ? colors.white : isActive ? colors.forest : colors.muted}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: layout.tabBarHeight,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    paddingTop: 7,
    paddingBottom: 8,
  },
  item: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 32,
    height: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.softGreen,
  },
  iconWrapTripsActive: {
    backgroundColor: colors.forest,
  },
  label: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.forest,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.68,
  },
});
