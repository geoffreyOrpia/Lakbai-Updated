import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatKm } from "../../../core/utils/format.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
import { BackAction, SecondaryButton } from "../components/Buttons.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { LoadingState } from "../components/LoadingState.jsx";

export const NearbyScreen = ({ viewModel }) => {
  const state = viewModel.state;
  if (state.loading) {
    return <View style={styles.centerScreen}>
        <LoadingState title="Finding nearby saved places" text="Using your current GPS position and destination packs in your local Library." />
      </View>;
  }

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackAction label="Home" onPress={() => viewModel.back()} />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>OFFLINE GPS</Text>
        <Text style={styles.title}>Nearby Places</Text>
        <Text style={styles.subtitle}>Find attractions and useful stops from destination packs you already saved. Distance ranking works without an internet connection.</Text>
      </View>

      {state.savedPackCount === 0 ? <EmptyState
        icon="bookmark-outline"
        title="Save a destination first"
        text="Nearby Places only uses destination packs in your local Library, so the feature remains useful when you lose signal."
        actionLabel="Open Library"
        onAction={() => viewModel.openLibrary()}
      /> : null}

      {state.permission === 'denied' ? <EmptyState
        icon="location-outline"
        title="Location permission is needed"
        text="Allow foreground location access to calculate distances to places stored on this device. Your position is not uploaded by this feature."
        actionLabel="Try again"
        onAction={() => void viewModel.load()}
      /> : null}

      {state.error ? <InfoBanner tone="warn" text={state.error} /> : null}
      {state.fix?.accuracy != null && state.fix.accuracy > 100 ? <InfoBanner
        tone="warn"
        text={`Current GPS accuracy is about ${Math.round(state.fix.accuracy)} m, so nearby ordering is approximate. Move to an open area and refresh for a better fix.`}
      /> : null}

      {state.fix ? <View style={[styles.gpsCard, shadows.soft]}>
          <View style={styles.gpsIcon}>
            <Ionicons name="locate" size={18} color={colors.primary} />
          </View>
          <View style={styles.gpsCopy}>
            <Text style={styles.gpsTitle}>{state.places.length} nearby saved {state.places.length === 1 ? 'place' : 'places'}</Text>
            <Text style={styles.gpsText}>GPS accuracy: {state.fix.accuracy == null ? 'unavailable' : `about ${Math.round(state.fix.accuracy)} m`} · {state.savedPackCount} saved {state.savedPackCount === 1 ? 'pack' : 'packs'} searched</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh nearby places" onPress={() => void viewModel.load()} hitSlop={8} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </Pressable>
        </View> : null}

      {state.fix && state.places.length === 0 ? <EmptyState icon="location-outline" title="No saved places found" text="The saved destination packs do not contain coordinate-based places yet." /> : null}

      {state.places.length ? <View style={styles.list}>
          {state.places.map(place => <Pressable
            key={place.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${place.destinationName}, ${place.spot.name}, ${formatKm(place.distanceKm)} away`}
            onPress={() => viewModel.openDestination(place.destinationId)}
            style={({ pressed }) => [styles.placeCard, shadows.card, pressed && styles.pressed]}
          >
              <View style={styles.placeIcon}>
                <Ionicons name={iconForCategory(place.category, place.kind)} size={18} color={colors.primary} />
              </View>
              <View style={styles.placeCopy}>
                <View style={styles.placeTitleRow}>
                  <Text style={styles.placeName}>{place.spot.name}</Text>
                  {place.kind === 'destination' ? <View style={styles.areaPill}>
                      <Text style={styles.areaPillText}>AREA CENTER</Text>
                    </View> : null}
                </View>
                <Text style={styles.placeMeta}>{place.destinationName}{place.municipality ? ` · ${place.municipality}` : ''}</Text>
                <Text style={styles.placeDescription} numberOfLines={2}>{place.spot.description}</Text>
              </View>
              <View style={styles.distancePill}>
                <Text style={styles.distanceText}>{formatKm(place.distanceKm)}</Text>
              </View>
            </Pressable>)}
        </View> : null}

      {state.savedPackCount > 0 ? <SecondaryButton label="Refresh GPS position" icon="locate-outline" onPress={() => void viewModel.load()} /> : null}

      <InfoBanner tone="info" text="Nearby Places uses only your foreground GPS fix and coordinates bundled inside saved LakbayLokal packs. It does not search the web for nearby businesses." />
    </ScrollView>;
};

const iconForCategory = (category, kind) => {
  if (kind === 'destination') return 'map-outline';
  if (['park', 'nature'].includes(category)) return 'leaf-outline';
  if (['beach', 'island'].includes(category)) return 'water-outline';
  if (category === 'viewpoint') return 'telescope-outline';
  if (category === 'market') return 'basket-outline';
  if (['museum', 'landmark'].includes(category)) return 'library-outline';
  if (category === 'transport') return 'bus-outline';
  if (category === 'facility') return 'medical-outline';
  if (['town', 'city'].includes(category)) return 'storefront-outline';
  return 'location-outline';
};

const styles = StyleSheet.create({
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: layout.screenGutter,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12.5,
    lineHeight: 18,
  },
  gpsCard: {
    borderWidth: 1,
    borderColor: '#CBE6D5',
    borderRadius: radius.lg,
    backgroundColor: colors.primarySofter,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gpsIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsCopy: {
    flex: 1,
  },
  gpsTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  gpsText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 14,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: spacing.sm,
  },
  placeCard: {
    minHeight: 104,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  placeIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeCopy: {
    flex: 1,
  },
  placeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  placeName: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '900',
  },
  areaPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
  },
  areaPillText: {
    color: colors.primary,
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  placeMeta: {
    marginTop: 2,
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: '800',
  },
  placeDescription: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 10.8,
    lineHeight: 15,
  },
  distancePill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  distanceText: {
    color: colors.accentDark,
    fontSize: 10,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
