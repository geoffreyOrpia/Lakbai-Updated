import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, shadows, spacing } from "../../../theme.jsx";
export const CategoryChips = ({
  options,
  selected,
  onSelect
}) => {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {options.map(option => {
      const active = selected === option.key;
      return <Pressable key={option.key} onPress={() => onSelect(option.key)} style={({
        pressed
      }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>;
    })}
    </ScrollView>;
};
const styles = StyleSheet.create({
  content: {
    gap: spacing.xs,
    paddingVertical: 2
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    justifyContent: 'center'
  },
  chipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
    ...shadows.soft
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  labelActive: {
    color: colors.white,
    fontWeight: '800'
  },
  pressed: {
    opacity: 0.78
  }
});
