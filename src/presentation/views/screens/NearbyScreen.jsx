import { ScreenScrollView as ScrollView } from "../components/ScreenScrollView.jsx";
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatKm } from "../../../core/utils/format.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
import { BackAction, SecondaryButton } from "../components/Buttons.jsx";
import { DiscoveryMap } from "../components/DiscoveryMap.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { SearchField } from "../components/SearchField.jsx";

export const NearbyScreen = ({ viewModel }) => {
  const state = viewModel.state;
  const searchResults = viewModel.searchResults;
  if (state.loading) {
    return <View style={styles.centerScreen}>
        <LoadingState title="Finding nearby places" text="Opening places, streets, and your saved map spots." />
      </View>;
  }

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackAction label="Home" onPress={() => viewModel.back()} />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>DAVAO DEL NORTE · OFFLINE</Text>
        <Text style={styles.title}>Nearby places</Text>
        <Text style={styles.subtitle}>Search places and streets. Touch and hold the map to save a spot.</Text>
      </View>

      <SearchField
        value={state.query}
        onChangeText={value => viewModel.setQuery(value)}
        placeholder="Search local places or streets"
        onSubmit={() => undefined}
      />

      <DiscoveryMap
        basemapUri={state.basemapUri}
        fix={state.fix}
        pins={state.pins}
        onDropPin={point => viewModel.dropPin(point)}
      />

      {state.permission === 'denied' ? <EmptyState
        icon="location-outline"
        title="Your location is off"
        text="You can still search and use the map. Allow location access to see which places are closest."
        actionLabel="Try again"
        onAction={() => void viewModel.load()}
      /> : null}

      {state.error ? <InfoBanner tone="warn" text={state.error} /> : null}
      {state.fix?.accuracy != null && state.fix.accuracy > 100 ? <InfoBanner
        tone="warn"
        text={`Current GPS accuracy is about ${Math.round(state.fix.accuracy)} m, so nearby ordering is approximate. Move to an open area and refresh for a better fix.`}
      /> : null}

      {state.query.trim() ? <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Offline search results</Text>
            <Text style={styles.sectionMeta}>{searchResults.length} shown</Text>
          </View>
          {searchResults.length ? <View style={styles.list}>
              {searchResults.map(entry => <DiscoveryEntry
                key={entry.id}
                entry={entry}
                onOpen={() => viewModel.openEntry(entry)}
                onRoute={entry.coordinateStatus === 'derived-area-center'
                  ? null
                  : () => viewModel.navigateToEntry(entry)}
              />)}
            </View> : <EmptyState
              icon="search-outline"
              title="No offline match"
              text="Try another place or street name."
            />}
        </View> : <>
          {state.recents.length ? <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent destinations</Text>
                <Text style={styles.sectionMeta}>Saved on your phone</Text>
              </View>
              <View style={styles.compactList}>
                {state.recents.slice(0, 5).map(entry => <DiscoveryEntry
                  key={`recent:${entry.id}`}
                  entry={entry}
                  compact
                  onOpen={() => viewModel.openEntry(entry)}
                  onRoute={entry.coordinateStatus === 'derived-area-center'
                    ? null
                    : () => viewModel.navigateToEntry(entry)}
                />)}
              </View>
            </View> : null}

          {state.pins.length ? <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Dropped pins</Text>
                <Text style={styles.sectionMeta}>{state.pins.length} saved</Text>
              </View>
              <View style={styles.compactList}>
                {state.pins.map(pin => <DiscoveryEntry
                  key={pin.id}
                  entry={pin}
                  compact
                  onOpen={() => viewModel.navigateToEntry(pin)}
                  onRoute={() => viewModel.navigateToEntry(pin)}
                  onRemove={() => void viewModel.removePin(pin.id)}
                />)}
              </View>
            </View> : null}
        </>}

      {state.fix ? <View style={[styles.gpsCard, shadows.soft]}>
          <View style={styles.gpsIcon}>
            <Ionicons name="locate" size={18} color={colors.primary} />
          </View>
          <View style={styles.gpsCopy}>
            <Text style={styles.gpsTitle}>{state.places.length} nearby saved {state.places.length === 1 ? 'place' : 'places'}</Text>
            <Text style={styles.gpsText}>GPS accuracy: {state.fix.accuracy == null ? 'unavailable' : `about ${Math.round(state.fix.accuracy)} m`} · {state.savedPackCount} saved {state.savedPackCount === 1 ? 'guide' : 'guides'} searched</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh nearby places" onPress={() => void viewModel.load()} hitSlop={8} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </Pressable>
        </View> : null}

      {state.fix && state.savedPackCount === 0 ? <InfoBanner
        tone="info"
        text="Save a place’s guide to see nearby suggestions. You can already search places and streets above."
      /> : null}

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

      <InfoBanner tone="info" text="Nearby places does not query Google or live business listings. Street matches come from LakBai’s bundled Davao del Norte OSM routing dataset; mapped place coordinates and dropped pins are not automatically verified entrances." />
    </ScrollView>;
};

const coordinateLabel = entry => {
  if (entry.coordinateStatus === 'verified') return 'VERIFIED POINT';
  if (entry.coordinateStatus === 'user-pin') return 'YOUR PIN';
  if (entry.coordinateStatus === 'osm-road-reference') return 'OSM ROAD';
  if (entry.coordinateStatus === 'derived-area-center') return 'AREA CENTER';
  return 'MAPPED · CHECK ACCESS';
};

const DiscoveryEntry = ({ entry, onOpen, onRoute, onRemove, compact = false }) => (
  <View style={[styles.discoveryCard, compact && styles.discoveryCardCompact, shadows.soft]}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${entry.name}`}
      onPress={onOpen}
      style={({ pressed }) => [styles.discoveryMain, pressed && styles.pressed]}
    >
      <View style={styles.placeIcon}>
        <Ionicons name={iconForCategory(entry.category, entry.kind)} size={17} color={colors.primary} />
      </View>
      <View style={styles.placeCopy}>
        <Text style={styles.placeName}>{entry.name}</Text>
        {entry.subtitle ? <Text style={styles.placeMeta}>{entry.subtitle}</Text> : null}
        <View style={styles.discoveryMetaRow}>
          <Text style={styles.coordinateLabel}>{coordinateLabel(entry)}</Text>
          {entry.distanceKm != null ? <Text style={styles.discoveryDistance}>{formatKm(entry.distanceKm)}</Text> : null}
        </View>
      </View>
    </Pressable>
    <View style={styles.discoveryActions}>
      {onRoute ? <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Route to ${entry.name}`}
        onPress={onRoute}
        style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
      >
        <Ionicons name="navigate-outline" size={18} color={colors.primary} />
      </Pressable> : null}
      {onRemove ? <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${entry.name}`}
        onPress={onRemove}
        style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
      >
        <Ionicons name="trash-outline" size={17} color={colors.danger ?? colors.accentDark} />
      </Pressable> : null}
    </View>
  </View>
);

const iconForCategory = (category, kind) => {
  if (kind === 'destination') return 'map-outline';
  if (kind === 'street') return 'trail-sign-outline';
  if (kind === 'pin') return 'pin-outline';
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
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  sectionMeta: {
    color: colors.muted,
    fontSize: 9.8,
    fontWeight: '800',
  },
  compactList: {
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
  discoveryCard: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoveryCardCompact: {
    minHeight: 68,
  },
  discoveryMain: {
    flex: 1,
    minWidth: 0,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  discoveryMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  coordinateLabel: {
    color: colors.muted,
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.25,
  },
  discoveryDistance: {
    color: colors.primary,
    fontSize: 9.5,
    fontWeight: '900',
  },
  discoveryActions: {
    paddingRight: spacing.xs,
    gap: 2,
  },
  iconAction: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
