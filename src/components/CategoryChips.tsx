import { ScrollView, StyleSheet, Text, Pressable } from 'react-native';

import { destinationCategories, type DestinationCategory } from '../data/destinations';
import { colors, radius, spacing } from '../theme';

export type CategoryKey = 'all' | DestinationCategory;

type Props = {
  selected: CategoryKey;
  onSelect: (category: CategoryKey) => void;
};

export function CategoryChips({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {destinationCategories.map((category) => {
        const active = selected === category.key;
        return (
          <Pressable
            key={category.key}
            onPress={() => onSelect(category.key)}
            style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{category.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xs,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.softGreen,
    borderColor: '#C9DDCC',
  },
  label: {
    color: colors.muted,
    fontSize: 11.5,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.forest,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
  },
});
