import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from "../../../theme.jsx";

const TONES = {
  info: {
    bg: colors.infoSoft,
    border: '#D7E3F2',
    icon: 'information-circle',
    color: '#2B5D8F'
  },
  success: {
    bg: colors.primarySofter,
    border: '#CBE6D5',
    icon: 'checkmark-circle',
    color: colors.primary
  },
  warn: {
    bg: colors.accentSoft,
    border: '#F3D9C4',
    icon: 'warning',
    color: colors.accentDark
  },
  danger: {
    bg: colors.dangerSoft,
    border: '#F2CFCF',
    icon: 'alert-circle',
    color: colors.danger
  }
};

export const InfoBanner = ({
  tone,
  icon,
  text
}) => {
  const palette = TONES[tone];
  return <View
    accessibilityRole={tone === 'danger' || tone === 'warn' ? 'alert' : 'text'}
    accessibilityLiveRegion="polite"
    style={[styles.banner, {
      backgroundColor: palette.bg,
      borderColor: palette.border
    }]}
  >
      <Ionicons name={icon ?? palette.icon} size={17} color={palette.color} />
      <Text style={[styles.text, { color: palette.color }]}>{text}</Text>
    </View>;
};

const styles = StyleSheet.create({
  banner: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  text: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '700'
  }
});
