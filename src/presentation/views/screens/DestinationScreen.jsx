import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFeedback } from "../../../feedback/FeedbackProvider.jsx";
import { BackAction } from "../components/Buttons.jsx";
import { CoverArt } from "../components/CoverArt.jsx";
import { DestinationMap } from "../components/DestinationMap.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { SectionHeader } from "../components/SectionHeader.jsx";
import { TrailMiniMap } from "../components/TrailMiniMap.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
import { formatRelativeTime, formatSizeKb } from "../../../core/utils/format.jsx";
export const DestinationScreen = ({
  viewModel
}) => {
  const state = viewModel.state;
  const {
    showSnackbar,
    showConfirm
  } = useFeedback();
  const pack = state.pack;
  const performLibraryAction = async () => {
    const result = state.updateAvailable
      ? await viewModel.saveToLibrary(true)
      : state.saved
      ? await viewModel.removeFromLibrary()
      : await viewModel.saveToLibrary();
    showSnackbar({
      message: result.message,
      tone: result.ok ? 'success' : 'error'
    });
  };
  const runLibraryAction = () => {
    if (!state.saved || state.updateAvailable) {
      void performLibraryAction();
      return;
    }
    showConfirm({
      title: 'Remove saved pack?',
      message: 'This pack’s materialized offline files will be removed from your local Library. Favorites and itineraries are kept, and the content bundled inside the app remains available.',
      confirmLabel: 'Remove',
      tone: 'danger',
      onConfirm: () => void performLibraryAction()
    });
  };
  const toggleFavorite = async () => {
    const result = await viewModel.toggleFavorite();
    showSnackbar({
      message: result.message,
      tone: result.ok ? 'success' : 'error'
    });
  };
  if (state.loading) {
    return <View style={styles.centerScreen}>
        <LoadingState title="Opening destination guide" text="Reading the bundled guide and your local Library state." />
      </View>;
  }
  if (!pack) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BackAction label="Back" onPress={() => viewModel.back()} />
        <EmptyState icon="alert-circle-outline" title="Destination unavailable" text={state.error ?? 'This destination pack is unavailable.'} actionLabel="Try again" onAction={() => void viewModel.load()} />
      </ScrollView>;
  }
  const destination = pack.destination;
  const firstPhoto = destination.photos?.[0];
  const runDirections = async place => {
    const result = await viewModel.openDirections(place);
    showSnackbar({
      message: result.message,
      tone: result.ok ? 'success' : 'error'
    });
  };
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackAction label="Explore" onPress={() => viewModel.back()} />

      <CoverArt theme={destination.coverTheme} photoKey={firstPhoto?.key} height={190} radius={radius.xl}>
        <View style={styles.heroOverlay}>
          <Text style={styles.heroCategory}>{destination.category.toUpperCase()} PACK</Text>
          <Text style={styles.heroName}>{destination.name}</Text>
          <Text style={styles.heroArea}>{destination.area}</Text>
        </View>
      </CoverArt>
      {firstPhoto ? <Text style={styles.photoCredit}>Photo: {firstPhoto.credit}</Text> : null}

      <View style={styles.pillRow}>
        <Pill icon="ellipse" text={`v${pack.version}`} />
        <Pill icon="time-outline" text={formatRelativeTime(pack.updatedAt)} />
        <Pill icon="archive-outline" text={formatSizeKb(pack.sizeKb)} />
        {state.saved ? <Pill icon="checkmark-circle" text="Offline ready" tone="primary" /> : null}
        {state.offlineBundle?.contextMapUri ? <Pill icon="map-outline" text="Regional map saved" /> : null}
        {state.offlineBundle?.basemapUri ? <Pill icon="trail-sign-outline" text="Offline roads & water" tone="primary" /> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: state.favorite }}
        accessibilityLabel={state.favorite ? `Remove ${destination.name} from Favorites` : `Add ${destination.name} to Favorites`}
        onPress={() => void toggleFavorite()}
        style={({ pressed }) => [styles.favoriteButton, state.favorite && styles.favoriteButtonActive, pressed && styles.pressed]}
      >
        <Ionicons name={state.favorite ? "heart" : "heart-outline"} size={18} color={state.favorite ? colors.danger : colors.primary} />
        <Text style={[styles.favoriteButtonText, state.favorite && styles.favoriteButtonTextActive]}>
          {state.favorite ? 'Saved to Favorites' : 'Add to Favorites'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={state.updateAvailable ? `Update ${destination.name} saved pack` : state.saved ? `Remove ${destination.name} saved pack` : `Save ${destination.name} for offline use`}
        accessibilityState={{ disabled: state.busy, busy: state.busy }}
        disabled={state.busy}
        onPress={() => void runLibraryAction()}
        style={({
      pressed
    }) => [styles.cta, state.saved && !state.updateAvailable && styles.ctaRemove, state.busy && styles.ctaDisabled, pressed && !state.busy && styles.pressed]}>
        <Ionicons
          name={state.busy ? 'hourglass-outline' : state.updateAvailable ? 'refresh-outline' : state.saved ? 'trash-outline' : 'bookmark-outline'}
          size={18}
          color={state.saved && !state.updateAvailable ? colors.danger : colors.onPrimary}
        />
        <Text style={[styles.ctaText, state.saved && !state.updateAvailable && styles.ctaTextRemove]}>
          {state.busy
            ? state.updateAvailable
              ? 'Updating saved pack…'
              : state.saved
              ? 'Removing saved pack…'
              : 'Saving offline pack…'
            : state.updateAvailable
            ? 'Update saved pack'
            : state.saved
            ? 'Remove from library'
            : destination.status === 'available'
            ? 'Save pack to local library'
            : 'Pack coming soon'}
        </Text>
      </Pressable>

      {state.updateAvailable ? <InfoBanner tone="info" text={`A newer bundled version is available. Updating replaces this pack's saved files while keeping your Favorites, itineraries, and other personal data.`} /> : null}
      {!state.saved && destination.status === 'available' ? <InfoBanner tone="info" text="Save this pack to create durable local guide, map, route-plan, image, and photo-metadata files. The image source is already bundled with the app, and itineraries stay in local SQLite." /> : null}

      <InfoBanner tone="warn" text="Travel conditions, access rules, transport schedules, and local facilities can change. Confirm time-sensitive details with the destination or local authorities before traveling." />

      {destination.verification ? <View style={[styles.verificationCard, shadows.soft]}>
          <View style={styles.verificationHeading}>
            <Ionicons
              name={destination.verification.status === 'partial' ? "shield-checkmark-outline" : "flask-outline"}
              size={18}
              color={destination.verification.status === 'partial' ? colors.primary : colors.accentDark}
            />
            <View style={styles.verificationCopy}>
              <Text style={styles.verificationEyebrow}>CONTENT STATUS</Text>
              <Text style={styles.verificationTitle}>
                {destination.verification.status === 'partial' ? 'Core facts source-reviewed' : 'Prototype content'}
              </Text>
            </View>
          </View>
          <Text style={styles.verificationText}>{destination.verification.summary}</Text>
          {destination.verification.sources?.length ? <View style={styles.verificationSources}>
              {destination.verification.sources.map(source => <View key={source.url} style={styles.verificationSource}>
                  <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                  <View style={styles.verificationSourceCopy}>
                    <Text style={styles.verificationSourceLabel}>{source.label}</Text>
                    <Text style={styles.verificationSourceScope}>{source.scope}</Text>
                  </View>
                </View>)}
            </View> : null}
          <Text style={styles.verificationReviewed}>Reviewed {destination.verification.reviewedAt}</Text>
        </View> : null}

      {destination.navigation ? <View style={[styles.locationCard, shadows.card]}>
          <View style={styles.locationHeading}>
            <View style={styles.locationIcon}>
              <Ionicons name="navigate" size={19} color={colors.primary} />
            </View>
            <View style={styles.locationCopy}>
              <Text style={styles.locationEyebrow}>LOCATION & ROUTE</Text>
              <Text style={styles.locationName}>{destination.navigation.label}</Text>
              <Text style={styles.locationArea}>{destination.area}, Davao del Norte</Text>
            </View>
          </View>
          <Text style={styles.locationNote}>{destination.navigation.note}</Text>
          {destination.offlineNavigation ? <>
              <View style={styles.routingPilotBadge}>
                <Ionicons name="cloud-offline-outline" size={13} color={colors.primary} />
                <Text style={styles.routingPilotText}>OFFLINE ROUTING PILOT · {destination.offlineNavigation.coverage}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={state.saved ? `Navigate to ${destination.name} with LakBai` : `Save ${destination.name} to enable LakBai navigation`}
                accessibilityState={{ disabled: !state.saved }}
                disabled={!state.saved}
                onPress={() => viewModel.openOfflineNavigation()}
                style={({ pressed }) => [styles.directionsButton, !state.saved && styles.ctaDisabled, pressed && state.saved && styles.pressed]}
              >
                <Ionicons name={state.saved ? 'navigate' : 'lock-closed'} size={17} color={colors.onPrimary} />
                <Text style={styles.directionsButtonText}>{state.saved ? 'Navigate with LakBai' : 'Save pack to enable LakBai navigation'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open optional external directions to ${destination.name}`}
                accessibilityState={{ disabled: state.directionsBusyId !== null, busy: state.directionsBusyId === destination.id }}
                disabled={state.directionsBusyId !== null}
                onPress={() => void runDirections(destination)}
                style={({ pressed }) => [styles.externalDirectionsButton, state.directionsBusyId !== null && styles.ctaDisabled, pressed && state.directionsBusyId === null && styles.pressed]}
              >
                <Ionicons name={state.directionsBusyId === destination.id ? 'hourglass-outline' : 'open-outline'} size={16} color={colors.primary} />
                <Text style={styles.externalDirectionsText}>{state.directionsBusyId === destination.id ? 'Opening…' : 'Optional external directions'}</Text>
              </Pressable>
              <Text style={styles.connectionHint}>LakBai routing and its saved map work offline. External directions require internet and are optional.</Text>
            </> : <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open directions to ${destination.name}`}
                accessibilityState={{ disabled: state.directionsBusyId !== null, busy: state.directionsBusyId === destination.id }}
                disabled={state.directionsBusyId !== null}
                onPress={() => void runDirections(destination)}
                style={({ pressed }) => [styles.directionsButton, state.directionsBusyId !== null && styles.ctaDisabled, pressed && state.directionsBusyId === null && styles.pressed]}
              >
                <Ionicons name={state.directionsBusyId === destination.id ? 'hourglass-outline' : 'map-outline'} size={17} color={colors.onPrimary} />
                <Text style={styles.directionsButtonText}>{state.directionsBusyId === destination.id ? 'Opening Maps…' : 'Open directions'}</Text>
              </Pressable>
              <Text style={styles.connectionHint}>Requires internet. In Maps, choose “Your location” as the starting point.</Text>
            </>}
        </View> : null}

      {pack.spots?.length ? <View style={styles.section}>
          <SectionHeader eyebrow="MapLibre + OpenStreetMap" title="Destination map" />
          <DestinationMap
            pack={pack}
            offlineMapUri={state.offlineBundle?.mapUri}
            offlineContextUri={state.offlineBundle?.contextMapUri}
            offlineBasemapUri={state.offlineBundle?.basemapUri}
          />
          <InfoBanner
            tone="info"
            text={state.offlineBundle?.basemapUri
              ? "Offline mode uses the bundled Davao del Norte vector basemap, saved municipality boundary, and this pack’s places. If the detailed local map cannot load, MapLibre falls back to the saved context. Online mode uses OpenStreetMap live tiles."
              : state.offlineBundle?.contextMapUri
              ? "Offline mode uses the saved municipality boundary and this pack’s places without network tiles. Online mode uses OpenStreetMap live tiles and automatically falls back to local map data when possible."
              : "Online mode uses OpenStreetMap live tiles with bundled municipality context underneath. Save this destination pack before travel to enable the full offline map."}
          />
        </View> : null}

      <View style={styles.section}>
        <SectionHeader eyebrow="About" title="Destination guide" />
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.bodyText}>{destination.description}</Text>
          {destination.highlights.length ? <View style={styles.highlightList}>
              {destination.highlights.map(highlight => <View key={highlight} style={styles.highlightRow}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                  <Text style={styles.highlightText}>{highlight}</Text>
                </View>)}
            </View> : null}
        </View>
      </View>

      {pack.routeSuggestions?.length ? <View style={styles.section}>
          <SectionHeader eyebrow="Suggested tourist routes" title="Curated stop sequences" />
          <InfoBanner
            tone="info"
            text="Suggested routes remain planning sequences. When source-verified GPS geometry is available, LakBai exposes it separately below in the in-app offline trail navigator."
          />
          <View style={styles.list}>
            {pack.routeSuggestions.map(route => <View key={route.id} style={[styles.routeCard, shadows.card]}>
                <View style={styles.routeHeader}>
                  <View style={styles.routeIcon}>
                    <Ionicons name="git-branch-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.routeCopy}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    <Text style={styles.routeDescription}>{route.description}</Text>
                  </View>
                </View>
                <View style={styles.trailMetaRow}>
                  <Pill icon="footsteps-outline" text={`~${route.estimatedDistanceKm} km`} />
                  <Pill icon="time-outline" text={`~${route.estimatedDurationMin} min`} />
                  <Pill icon="trending-up-outline" text={route.difficulty} tone="accent" />
                  {route.planningOnly ? <Pill icon="information-circle-outline" text="Planning only" /> : null}
                </View>
                <View style={styles.routeStops}>
                  {route.stops.map((stop, index) => <View key={stop.id} style={styles.routeStop}>
                      <View style={styles.routeStopMarker}>
                        <Text style={styles.routeStopNumber}>{index + 1}</Text>
                        {index < route.stops.length - 1 ? <View style={styles.routeStopLine} /> : null}
                      </View>
                      <View style={styles.routeStopCopy}>
                        <Text style={styles.routeStopName}>{stop.name}</Text>
                        {stop.note ? <Text style={styles.routeStopNote}>{stop.note}</Text> : null}
                      </View>
                    </View>)}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Plan ${route.name} in Trips`}
                  onPress={() => viewModel.planRoute(route)}
                  style={({ pressed }) => [styles.planRouteButton, pressed && styles.pressed]}
                >
                  <Ionicons name="calendar-outline" size={15} color={colors.onPrimary} />
                  <Text style={styles.planRouteButtonText}>Plan this route in Trips</Text>
                </Pressable>
              </View>)}
          </View>
        </View> : null}

      {pack.trails.length || pack.withheldTrailsCount ? <View style={styles.section}>
          <SectionHeader eyebrow="Verified offline trails" title="LakBai Trail Navigation" />
          {pack.withheldTrailsCount ? <InfoBanner
            tone="warn"
            text={`${pack.withheldTrailsCount} prototype ${pack.withheldTrailsCount === 1 ? 'route is' : 'routes are'} intentionally hidden until every waypoint is verified by a reliable local or mapping source.`}
          /> : null}
          {pack.trails.length ? <View style={styles.list}>
            {pack.trails.map(trail => <Pressable
              key={trail.id}
              accessibilityRole="button"
              accessibilityLabel={state.saved ? `Open ${trail.name} trail navigator` : `Save ${destination.name} to your Library to unlock ${trail.name}`}
              accessibilityState={{
                disabled: !state.saved
              }}
              disabled={!state.saved}
              onPress={() => viewModel.openTrail(trail.id)}
              style={({ pressed }) => [[styles.card, shadows.card], !state.saved && styles.trailLocked, pressed && state.saved && styles.pressed]}
            >
                <TrailMiniMap trail={trail} height={130} />
                <View style={styles.trailBody}>
                  <Text style={styles.trailName}>{trail.name}</Text>
                  <View style={styles.trailMetaRow}>
                    <Pill icon="footsteps-outline" text={`${trail.distanceKm} km`} />
                    <Pill icon="time-outline" text={`${trail.durationMin} min`} />
                    <Pill icon="trending-up-outline" text={trail.difficulty} tone="accent" />
                  </View>
                  <Text style={styles.trailDescription} numberOfLines={2}>
                    {trail.description}
                  </Text>
                  <View style={[styles.trailOpen, !state.saved && styles.trailOpenLocked]}>
                    <Text style={[styles.trailOpenText, !state.saved && styles.trailOpenTextLocked]}>{state.saved ? 'Open in-app navigator' : 'Save to Library to unlock'}</Text>
                    <Ionicons name={state.saved ? 'navigate' : 'lock-closed'} size={14} color={state.saved ? colors.primary : colors.muted} />
                  </View>
                </View>
              </Pressable>)}
          </View> : null}
        </View> : null}

      {pack.spots.length ? <View style={styles.section}>
          <SectionHeader eyebrow="Points of interest" title={`${pack.spots.length} curated spots`} />
          <View style={[styles.card, shadows.card]}>
            {pack.spots.map((spot, index) => <View key={spot.id} style={[styles.spotRow, index < pack.spots.length - 1 && styles.spotRowBorder]}>
                <View style={styles.spotIcon}>
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                </View>
                <View style={styles.spotCopy}>
                  <Text style={styles.spotName}>{spot.name}</Text>
                  <Text style={styles.spotText}>{spot.description}</Text>
                  {spot.tip ? <Text style={styles.spotTip}>Tip: {spot.tip}</Text> : null}
                  {destination.offlineNavigation ? <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={state.saved
                      ? `Navigate offline to ${spot.name} with LakBai`
                      : `Save ${destination.name} to navigate offline to ${spot.name}`}
                    accessibilityState={{ disabled: !state.saved }}
                    disabled={!state.saved}
                    onPress={() => viewModel.openOfflineNavigation(spot)}
                    style={({ pressed }) => [
                      styles.spotOfflineRoute,
                      !state.saved && styles.ctaDisabled,
                      pressed && state.saved && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name={state.saved ? 'navigate' : 'lock-closed'}
                      size={13}
                      color={colors.onPrimary}
                    />
                    <Text style={styles.spotOfflineRouteText}>
                      {state.saved ? 'Navigate offline' : 'Save pack for offline route'}
                    </Text>
                  </Pressable> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open optional external directions to ${spot.name}`}
                    disabled={state.directionsBusyId !== null}
                    onPress={() => void runDirections(spot)}
                    style={({ pressed }) => [styles.spotDirections, state.directionsBusyId !== null && styles.ctaDisabled, pressed && state.directionsBusyId === null && styles.pressed]}
                  >
                    <Ionicons name={state.directionsBusyId === spot.id ? 'hourglass-outline' : 'navigate-outline'} size={13} color={colors.primary} />
                    <Text style={styles.spotDirectionsText}>{state.directionsBusyId === spot.id ? 'Opening…' : 'Directions'}</Text>
                  </Pressable>
                </View>
              </View>)}
          </View>
        </View> : null}

      <View style={styles.section}>
        <SectionHeader eyebrow="Getting around" title="Transport notes" />
        <View style={[styles.card, shadows.card]}>
          <NoteGroup title="Getting there" icon="caret-forward" items={pack.transport.gettingThere} />
          <NoteGroup title="Getting around" icon="caret-forward" items={pack.transport.gettingAround} />
          <NoteGroup title="Local tips" icon="bulb-outline" items={pack.transport.localTips} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Safety" title="Reminders and contacts" />
        <View style={[styles.card, shadows.card]}>
          <NoteGroup title="Reminders" icon="shield-checkmark-outline" items={pack.safety.reminders} />
          {pack.safety.emergencyContacts.length ? <View style={styles.contactBlock}>
              <Text style={styles.noteGroupTitle}>Emergency contacts</Text>
              {pack.safety.emergencyContacts.map(contact => <View key={contact.label} style={styles.contactRow}>
                  <Ionicons name="call-outline" size={15} color={colors.danger} />
                  <View style={styles.contactCopy}>
                    <Text style={styles.contactLabel}>{contact.label}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                </View>)}
            </View> : null}
          {pack.safety.facilities.length ? <Text style={styles.facilities}>Nearby: {pack.safety.facilities.join(' · ')}</Text> : null}
        </View>
      </View>
    </ScrollView>;
};
const Pill = ({
  icon,
  text,
  tone = 'neutral'
}) => {
  return <View style={[styles.pill, tone === 'primary' && styles.pillPrimary, tone === 'accent' && styles.pillAccent]}>
      <Text style={[styles.pillText, tone === 'primary' && styles.pillTextPrimary, tone === 'accent' && styles.pillTextAccent]}>
        {text}
      </Text>
    </View>;
};
const NoteGroup = ({
  title,
  icon,
  items
}) => {
  if (!items.length) return null;
  return <View style={styles.noteGroup}>
      <View style={styles.noteGroupHeader}>
        <Ionicons name={icon} size={15} color={colors.primary} />
        <Text style={styles.noteGroupTitle}>{title}</Text>
      </View>
      {items.map(item => <Text key={item} style={styles.noteItem}>
          • {item}
        </Text>)}
    </View>;
};
const styles = StyleSheet.create({
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg
  },
  heroOverlay: {
    alignItems: 'center',
    gap: 3
  },
  heroCategory: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 1.1
  },
  heroName: {
    color: colors.white,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center'
  },
  heroArea: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11.5,
    fontWeight: '700'
  },
  photoCredit: {
    marginTop: -spacing.md,
    color: colors.muted,
    fontSize: 9.5,
    lineHeight: 14,
    textAlign: 'right'
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs
  },
  pill: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  pillPrimary: {
    backgroundColor: colors.primarySofter,
    borderColor: '#CBE6D5'
  },
  pillAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: '#F3D9C4'
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 10.2,
    fontWeight: '800',
    textTransform: 'capitalize'
  },
  pillTextPrimary: {
    color: colors.primary
  },
  pillTextAccent: {
    color: colors.accentDark
  },
  cta: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.card
  },
  favoriteButton: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  favoriteButtonActive: {
    borderColor: '#F2CFCF',
    backgroundColor: colors.dangerSoft
  },
  favoriteButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  favoriteButtonTextActive: {
    color: colors.danger
  },
  ctaRemove: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#F2CFCF'
  },
  ctaDisabled: {
    opacity: 0.55
  },
  ctaText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '900'
  },
  ctaTextRemove: {
    color: colors.danger
  },
  verificationCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm
  },
  verificationHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  verificationCopy: {
    flex: 1
  },
  verificationEyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8
  },
  verificationTitle: {
    marginTop: 2,
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  verificationText: {
    color: colors.textSecondary,
    fontSize: 11.2,
    lineHeight: 16
  },
  verificationSources: {
    gap: spacing.xs
  },
  verificationSource: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  verificationSourceCopy: {
    flex: 1
  },
  verificationSourceLabel: {
    color: colors.text,
    fontSize: 10.8,
    lineHeight: 15,
    fontWeight: '800'
  },
  verificationSourceScope: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 9.8,
    lineHeight: 14
  },
  verificationReviewed: {
    color: colors.faint,
    fontSize: 9.5,
    fontWeight: '700'
  },
  locationCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#CBE6D5',
    backgroundColor: colors.primarySofter,
    padding: spacing.md,
    gap: spacing.sm
  },
  locationHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  locationIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center'
  },
  locationCopy: {
    flex: 1
  },
  locationEyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.9
  },
  locationName: {
    marginTop: 2,
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900'
  },
  locationArea: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15
  },
  locationNote: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 17
  },
  directionsButton: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  directionsButtonText: {
    color: colors.onPrimary,
    fontSize: 12.5,
    fontWeight: '900'
  },
  routingPilotBadge: {
    minHeight: 30,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#CBE6D5',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  routingPilotText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.35
  },
  externalDirectionsButton: {
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  externalDirectionsText: {
    color: colors.primary,
    fontSize: 11.5,
    fontWeight: '900'
  },
  connectionHint: {
    color: colors.muted,
    fontSize: 9.8,
    lineHeight: 14,
    textAlign: 'center'
  },
  section: {
    gap: spacing.sm
  },
  list: {
    gap: spacing.sm
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm
  },
  bodyText: {
    color: colors.textSecondary,
    fontSize: 12.8,
    lineHeight: 19
  },
  highlightList: {
    gap: spacing.xs
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs
  },
  highlightText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600'
  },
  routeCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm
  },
  routeIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center'
  },
  routeCopy: {
    flex: 1
  },
  routeName: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: '900'
  },
  routeDescription: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 11.2,
    lineHeight: 16
  },
  planRouteButton: {
    minHeight: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  planRouteButtonText: {
    color: colors.onPrimary,
    fontSize: 11.5,
    fontWeight: '900'
  },
  routeStops: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm
  },
  routeStop: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  routeStopMarker: {
    width: 28,
    alignItems: 'center'
  },
  routeStopNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    color: colors.onPrimary,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 10,
    fontWeight: '900'
  },
  routeStopLine: {
    width: 2,
    flex: 1,
    minHeight: 18,
    backgroundColor: colors.border
  },
  routeStopCopy: {
    flex: 1,
    paddingBottom: spacing.sm
  },
  routeStopName: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800'
  },
  routeStopNote: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15
  },
  trailBody: {
    gap: spacing.xs
  },
  trailLocked: {
    opacity: 0.72
  },
  trailName: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: '900'
  },
  trailMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs
  },
  trailDescription: {
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 16
  },
  trailOpen: {
    minHeight: 34,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter
  },
  trailOpenLocked: {
    backgroundColor: colors.surfaceMuted
  },
  trailOpenText: {
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  trailOpenTextLocked: {
    color: colors.muted
  },
  spotRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm
  },
  spotRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  spotIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center'
  },
  spotCopy: {
    flex: 1
  },
  spotName: {
    color: colors.text,
    fontSize: 12.8,
    fontWeight: '800'
  },
  spotText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11.2,
    lineHeight: 16
  },
  spotTip: {
    marginTop: 2,
    color: colors.accentDark,
    fontSize: 10.8,
    lineHeight: 15,
    fontWeight: '600'
  },
  spotDirections: {
    minHeight: 32,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  spotOfflineRoute: {
    minHeight: 34,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  spotOfflineRouteText: {
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.25
  },
  spotDirectionsText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.25
  },
  noteGroup: {
    gap: spacing.xxs
  },
  noteGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2
  },
  noteGroupTitle: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '900'
  },
  noteItem: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 17,
    paddingLeft: 6
  },
  contactBlock: {
    gap: spacing.xs
  },
  contactRow: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#F2CFCF',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm + 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  contactCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  contactLabel: {
    color: colors.text,
    fontSize: 11.5,
    fontWeight: '800',
    flexShrink: 1
  },
  contactPhone: {
    color: colors.danger,
    fontSize: 11.5,
    fontWeight: '900'
  },
  facilities: {
    color: colors.muted,
    fontSize: 10.8,
    lineHeight: 15
  },
  pressed: {
    opacity: 0.9,
    transform: [{
      scale: 0.995
    }]
  }
});
