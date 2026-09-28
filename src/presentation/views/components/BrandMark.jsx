import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';
import { colors } from "../../../theme.jsx";

const OUTER_PIN = 'M128 10 C63 10 24 60 24 121 C24 203 128 306 128 306 C128 306 232 203 232 121 C232 60 193 10 128 10 Z';
const INNER_PIN = 'M128 30 C75 30 44 70 44 121 C44 184 128 271 128 271 C128 271 212 184 212 121 C212 70 181 30 128 30 Z';

const FrameLayer = () => (
  <>
    <Path d={OUTER_PIN} fill={colors.brandForest} />
    <Path d={INNER_PIN} fill={colors.brandCream} />
  </>
);

const LandscapeLayer = () => (
  <G clipPath="url(#sceneClip)">
    <Path
      d="M20 174 L65 126 L90 146 L128 104 L165 149 L190 126 L238 180 L238 226 L18 226 Z"
      fill={colors.brandLeaf}
    />
    <Path
      d="M38 186 L82 153 L104 169 L150 112 L199 184 L234 198 L234 235 L28 235 Z"
      fill={colors.brandForest}
    />
    <Path
      d="M102 169 L150 112 L199 184 L174 176 L151 144 L132 172 Z"
      fill={colors.primary}
    />
    <Path
      d="M88 190 C133 186 178 184 224 180 L230 222 C192 235 149 239 108 224 C91 218 78 210 68 202 Z"
      fill={colors.brandSea}
    />
    <Path
      d="M88 194 C132 192 177 190 217 187"
      fill="none"
      stroke="#D9F4FF"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <G fill={colors.brandLeaf}>
      <Circle cx="56" cy="180" r="20" />
      <Circle cx="75" cy="187" r="25" />
      <Circle cx="199" cy="181" r="23" />
      <Circle cx="219" cy="192" r="20" />
      <Circle cx="59" cy="214" r="27" />
      <Circle cx="206" cy="218" r="28" />
    </G>
  </G>
);

const SunLayer = () => (
  <G clipPath="url(#sceneClip)">
    <Circle cx="166" cy="87" r="34" fill={colors.brandOrange} />
  </G>
);

const RoadLayer = () => (
  <G clipPath="url(#sceneClip)">
    <Path
      d="M126 277 C107 253 108 234 130 220 C153 205 151 191 133 181 C120 174 122 165 134 157"
      fill="none"
      stroke="#FFF4DE"
      strokeWidth="31"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M126 277 C107 253 108 234 130 220 C153 205 151 191 133 181 C120 174 122 165 134 157"
      fill="none"
      stroke="#FFFBF2"
      strokeWidth="20"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M126 268 L119 257 M120 241 L131 233 M141 216 L147 211 M144 195 L135 189 M130 173 L134 160"
      fill="none"
      stroke={colors.brandForest}
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  </G>
);

const DetailsLayer = () => (
  <G clipPath="url(#sceneClip)" fill="none" stroke={colors.brandForest} strokeLinecap="round">
    <Path d="M65 188 C67 160 75 132 89 101" strokeWidth="8" />
    <Path d="M88 102 C73 85 58 80 44 78 M88 102 C70 96 57 98 45 105 M89 102 C87 82 91 68 98 56 M89 101 C104 82 117 76 132 76 M90 102 C108 98 122 102 136 112 M88 101 C74 75 73 63 76 50" strokeWidth="6" />
    <Path d="M172 68 C179 62 186 62 193 68 M193 68 C200 62 207 62 214 68 M188 83 C194 78 200 78 206 83 M206 83 C212 78 218 78 224 83" strokeWidth="4" />
  </G>
);

const SceneDefs = () => (
  <Defs>
    <ClipPath id="sceneClip">
      <Path d={INNER_PIN} />
    </ClipPath>
  </Defs>
);

export const BrandMarkLayer = ({ part = 'full', size = 160, style }) => (
  <View style={[{ width: size, height: size * 1.2 }, style]}>
    <Svg width="100%" height="100%" viewBox="0 0 256 320" accessibilityElementsHidden>
      <SceneDefs />
      {part === 'full' || part === 'frame' ? <FrameLayer /> : null}
      {part === 'full' || part === 'landscape' ? <LandscapeLayer /> : null}
      {part === 'full' || part === 'sun' ? <SunLayer /> : null}
      {part === 'full' || part === 'details' ? <DetailsLayer /> : null}
      {part === 'full' || part === 'road' ? <RoadLayer /> : null}
      {part === 'full' ? <Path d={INNER_PIN} fill="none" stroke="#FFFFFF" strokeWidth="5" /> : null}
    </Svg>
  </View>
);

export const BrandMark = ({ size = 36, style }) => (
  <BrandMarkLayer part="full" size={size} style={style} />
);

export const BrandWordmark = ({
  compact = false,
  light = false,
  showTagline = false,
  align = 'left',
}) => (
  <View style={[
    styles.wordmarkWrap,
    align === 'center' && styles.wordmarkCenter,
  ]}>
    <Text
      accessibilityRole="header"
      style={[
        styles.wordmark,
        compact && styles.wordmarkCompact,
        light && styles.wordmarkLight,
        align === 'center' && styles.textCenter,
      ]}
    >
      Lak<Text style={styles.wordmarkAccent}>Bai</Text>
    </Text>
    {showTagline ? (
      <Text style={[
        styles.tagline,
        light && styles.taglineLight,
        align === 'center' && styles.textCenter,
      ]}>
        EXPLORE DAVAO DEL NORTE
      </Text>
    ) : null}
  </View>
);

export const BrandLockup = ({
  markSize = 38,
  compact = true,
  showTagline = false,
  light = false,
}) => (
  <View
    accessible
    accessibilityLabel="LakBai. Explore Davao del Norte."
    style={styles.lockup}
  >
    <BrandMark size={markSize} />
    <BrandWordmark compact={compact} showTagline={showTagline} light={light} />
  </View>
);

const styles = StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  wordmarkWrap: {
    flexShrink: 1,
  },
  wordmarkCenter: {
    alignItems: 'center',
  },
  wordmark: {
    color: colors.brandForest,
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },
  wordmarkCompact: {
    fontSize: 20,
    lineHeight: 23,
    letterSpacing: -0.7,
  },
  wordmarkLight: {
    color: colors.white,
  },
  wordmarkAccent: {
    color: colors.brandOrange,
  },
  tagline: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 7.8,
    lineHeight: 11,
    fontWeight: '900',
    letterSpacing: 1.55,
  },
  taglineLight: {
    color: '#F7EEDC',
  },
  textCenter: {
    textAlign: 'center',
  },
});
