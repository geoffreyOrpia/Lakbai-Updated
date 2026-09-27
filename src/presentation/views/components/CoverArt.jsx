import { Ionicons } from '@expo/vector-icons';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getDestinationPhotoSource } from "../../assets/destinationPhotos.jsx";
import { colors } from "../../../theme.jsx";
const iconFor = themeIcon => {
  switch (themeIcon) {
    case 'water':
      return 'water';
    case 'leaf':
      return 'leaf';
    case 'paw':
      return 'paw';
    case 'business':
      return 'business';
    case 'trail-sign':
      return 'trail-sign';
    default:
      return 'location';
  }
};
/**
 * Destination cover artwork: brand gradient with layered geometric accents.
 * Generated on-device so covers render identically offline.
 */
export const CoverArt = ({
  theme,
  photoKey,
  height = 110,
  radius: cornerRadius = 14,
  children
}) => {
  const icon = iconFor(theme.icon);
  const photoSource = getDestinationPhotoSource(photoKey);
  if (photoSource) {
    return <ImageBackground
      source={photoSource}
      resizeMode="cover"
      imageStyle={{ borderRadius: cornerRadius }}
      style={[styles.wrap, {
        height,
        borderRadius: cornerRadius
      }]}
    >
        <LinearGradient
          colors={['rgba(7,31,24,0.16)', 'rgba(7,31,24,0.78)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.photoOverlay}
        />
        {children}
      </ImageBackground>;
  }
  return <LinearGradient colors={[theme.from, theme.to]} start={{
    x: 0,
    y: 0
  }} end={{
    x: 1,
    y: 1
  }} style={[styles.wrap, {
    height,
    borderRadius: cornerRadius
  }]}>
      <View style={[styles.circle, styles.circleLarge]} />
      <View style={[styles.circle, styles.circleSmall]} />
      <View style={[styles.ring, styles.ringLarge]} />
      <View style={[styles.ring, styles.ringSmall]} />
      <View style={styles.iconBadge}>
        <Ionicons name={icon} size={22} color={colors.white} />
      </View>
      {children}
    </LinearGradient>;
};
const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  circleLarge: {
    width: 130,
    height: 130,
    right: -34,
    top: -46
  },
  circleSmall: {
    width: 74,
    height: 74,
    left: -22,
    bottom: -28
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'transparent'
  },
  ringLarge: {
    width: 92,
    height: 92,
    right: 44,
    bottom: -34
  },
  ringSmall: {
    width: 44,
    height: 44,
    left: 30,
    top: -16
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
