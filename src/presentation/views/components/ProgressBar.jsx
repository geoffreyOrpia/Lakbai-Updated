import { StyleSheet, View } from 'react-native';
import { colors, radius } from "../../../theme.jsx";
export const ProgressBar = ({
  percent,
  tone = 'primary',
  height = 6
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  return <View style={[styles.track, {
    height,
    borderRadius: height / 2
  }]}>
      <View style={[styles.fill, {
      width: `${clamped}%`,
      borderRadius: height / 2,
      backgroundColor: tone === 'primary' ? colors.primary : colors.accent
    }]} />
    </View>;
};
const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.pill,
    overflow: 'hidden'
  },
  fill: {
    height: '100%'
  }
});
