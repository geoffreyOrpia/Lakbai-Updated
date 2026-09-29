import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../../theme.jsx';

/** Keep optional information available without competing with the main action. */
export const Disclosure = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(value => !value)}
        style={styles.button}
      >
        <Text style={styles.title}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>;
};

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.white },
  button: { minHeight: 48, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  body: { padding: spacing.sm, gap: spacing.md },
});
