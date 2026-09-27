import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
export const SearchField = ({
  value,
  onChangeText,
  placeholder = 'Search destinations',
  onSubmit
}) => {
  return <View style={[styles.container, shadows.soft]}>
      <Ionicons name="search-outline" size={18} color={colors.muted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.faint} style={styles.input} returnKeyType="search" onSubmitEditing={() => onSubmit?.(value.trim())} />
      {value ? <Ionicons name="close-circle" size={18} color={colors.faint} onPress={() => onChangeText('')} /> : null}
    </View>;
};
const styles = StyleSheet.create({
  container: {
    minHeight: layout.touchTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm + 2
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    color: colors.text,
    fontSize: 13.5
  }
});
