import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
export const PrimaryButton = ({
  label,
  onPress,
  disabled = false,
  icon = 'arrow-forward'
}) => {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({
    pressed
  }) => [styles.primary, shadows.card, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      <Text style={styles.primaryText}>{label}</Text>
      <Ionicons name={icon} size={17} color={colors.onPrimary} />
    </Pressable>;
};
export const SecondaryButton = ({
  label,
  onPress,
  disabled = false,
  icon
}) => {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({
    pressed
  }) => [styles.secondary, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      {icon ? <Ionicons name={icon} size={17} color={colors.primary} /> : null}
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>;
};
export const BackAction = ({
  label,
  onPress
}) => {
  return <Pressable onPress={onPress} style={({
    pressed
  }) => [styles.back, pressed && styles.pressed]}>
      <Ionicons name="arrow-back" size={19} color={colors.text} />
      <Text style={styles.backText}>{label}</Text>
    </Pressable>;
};
const styles = StyleSheet.create({
  primary: {
    minHeight: layout.touchTarget,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  primaryText: {
    color: colors.onPrimary,
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.1
  },
  secondary: {
    minHeight: layout.touchTarget,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  secondaryText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  back: {
    minHeight: layout.touchTarget - 2,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.sm
  },
  backText: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '800'
  },
  disabled: {
    opacity: 0.45
  },
  pressed: {
    opacity: 0.75,
    transform: [{
      scale: 0.99
    }]
  }
});
