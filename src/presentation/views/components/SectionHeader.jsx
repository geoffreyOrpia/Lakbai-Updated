import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from "../../../theme.jsx";
export const SectionHeader = ({
  eyebrow,
  title,
  actionLabel,
  onAction
}) => {
  return <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {actionLabel && onAction ? <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} hitSlop={8} style={({
      pressed
    }) => pressed && styles.pressed}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable> : null}
    </View>;
};
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  copy: {
    flex: 1
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 0.65,
    textTransform: 'uppercase'
  },
  title: {
    marginTop: 3,
    color: colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  action: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  pressed: {
    opacity: 0.6
  }
});
