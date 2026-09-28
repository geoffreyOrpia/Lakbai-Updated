import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from "../../../theme.jsx";

export const ScreenIntro = ({ eyebrow, title, subtitle, children }) => (
  <View style={styles.wrap}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    {children}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.brandOrange,
    fontSize: typography.micro,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  title: {
    maxWidth: 600,
    color: colors.text,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    maxWidth: 620,
    color: colors.textSecondary,
    fontSize: 12.8,
    lineHeight: 18,
  },
});
