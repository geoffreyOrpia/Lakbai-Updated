import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

type Props = {
  eyebrow?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ eyebrow, title, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.orange,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 0.65,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 3,
    color: colors.text,
    fontSize: 17.5,
    lineHeight: 22,
    fontWeight: '800',
  },
  action: {
    color: colors.forest,
    fontSize: 11.5,
    fontWeight: '800',
  },
});
