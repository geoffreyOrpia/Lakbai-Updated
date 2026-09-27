import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from "../../../theme.jsx";
export const EmptyState = ({
  icon,
  title,
  text
}) => {
  return <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>;
};
const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center'
  },
  text: {
    maxWidth: 300,
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center'
  }
});
