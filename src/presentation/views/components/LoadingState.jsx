import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from "../../../theme.jsx";

export const LoadingState = ({
  title = 'Loading…',
  text = null
}) => {
  return <View
      accessibilityRole="progressbar"
      accessibilityLabel={text ? `${title}. ${text}` : title}
      accessibilityLiveRegion="polite"
      style={styles.card}
    >
      <ActivityIndicator size="small" color={colors.primary} />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {text ? <Text style={styles.text}>{text}</Text> : null}
      </View>
    </View>;
};

const styles = StyleSheet.create({
  card: {
    minHeight: 104,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  copy: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '900'
  },
  text: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16
  }
});
