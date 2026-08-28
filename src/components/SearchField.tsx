import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, layout, radius, spacing } from '../theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export function SearchField({ value, onChangeText, placeholder = 'Search destinations' }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={19} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        returnKeyType="search"
      />
      {value ? (
        <Ionicons name="close-circle" size={18} color={colors.muted} onPress={() => onChangeText('')} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: layout.touchTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13.5,
  },
});
