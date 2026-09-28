import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { upcomingRouteManeuvers } from "../../../core/routing/routeProgress.jsx";
import { formatKm, formatDurationMinutes } from "../../../core/utils/format.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
import { BackAction, PrimaryButton, SecondaryButton } from "../components/Buttons.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { NavigationMap } from "../components/NavigationMap.jsx";
import { ProgressBar } from "../components/ProgressBar.jsx";
import { SectionHeader } from "../components/SectionHeader.jsx";

const maneuverIcon = kind => {
  if (kind === 'left' || kind === 'sharp-left' || kind === 'slight-left') return 'return-up-back-outline';
  if (kind === 'right' || kind === 'sharp-right' || kind === 'slight-right') return 'return-up-forward-outline';
  if (kind === 'uturn') return 'refresh-outline';
  if (kind === 'roundabout-enter' || kind === 'roundabout-exit') return 'sync-outline';
  if (kind === 'arrive') return 'flag-outline';
  return 'arrow-up-outline';
};

const formatAhead = km => {
  if (km == null) return '';
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m`;
  return formatKm(km);
};

const routePreferences = Object.freeze([
  {
    id: 'direct',
    label: 'Direct',
    icon: 'flash-outline',
    description: 'Shortest practical walking route in the local graph.',
  },
  {
    id: 'scenic',
    label: 'Scenic',
    icon: 'camera-outline',
    description: 'Prefer practical alternatives near curated offline parks, viewpoints, landmarks, beaches, attractions, or museums.',
  },
  {
    id: 'easy',
    label: 'Easy',
    icon: 'leaf-outline',
    description: 'Prefer surfaced streets and avoid rough or path-like segments when data allows. Not an accessibility guarantee.',
  },
  {
    id: 'adventure',
    label: 'Adventure',
    icon: 'trail-sign-outline',
    description: 'Prefer mapped walking paths and tracks when practical. Verified Trail Mode remains a separate source-reviewed experience.',
  },
]);

const preferenceLabel = preference => (
  routePreferences.find(option => option.id === preference)?.label ?? 'Direct'
);

const preferenceDescription = preference => (
  routePreferences.find(option => option.id === preference)?.description
  ?? routePreferences[0].description
);

export const NavigationScreen = ({ viewModel }) => {
  const state = viewModel.state;

  if (state.loading) {
    return <View style={styles.center}>
        <LoadingState title="Loading offline routing" text="Opening the saved basemap and local routing graph." />
      </View>;
  }

  const shownDistanceKm = state.tracking || state.arrived
    ? state.remainingKm ?? state.route?.distanceKm
    : state.route?.distanceKm;
  const shownDurationMin = state.tracking || state.arrived
    ? state.remainingMin ?? state.route?.durationMin
    : state.route?.durationMin;
  const routeSteps = state.route
    ? upcomingRouteManeuvers(state.route, state.distanceAlongKm ?? 0, 5)
    : [];
  const remainingStepCount = state.route
    ? Math.max(0, (state.route.maneuvers?.filter(maneuver => (
      maneuver.kind !== 'depart'
      && maneuver.distanceAlongKm >= (state.distanceAlongKm ?? 0) - 0.005
    )).length ?? 0) - routeSteps.filter(step => step.kind !== 'depart').length)
    : 0;

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackAction label={state.destinationName || 'Destination'} onPress={() => viewModel.back()} />

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="navigate" size={24} color={colors.onPrimary} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>LAKBAI OFFLINE NAVIGATION</Text>
          <Text style={styles.title}>{state.target?.label ?? state.destinationName}</Text>
          <Text style={styles.subtitle}>
            {state.mode === 'drive' ? 'Driving' : 'Walking'} · {state.coverage ?? 'Local offline coverage'}
            {state.mode === 'walk' ? ' · ' + preferenceLabel(state.preference) : ''}
          </Text>
        </View>
      </View>

      <InfoBanner
        tone="info"
        text="LakBai calculates this route on-device from the saved local road graph and renders it over the saved PMTiles map. No Google Maps or routing server is required."
      />

      {state.error ? <InfoBanner tone="warn" text={state.error} /> : null}
      {state.gpsError ? <InfoBanner tone="warn" text={state.gpsError} /> : null}
      {state.discoveryTarget && state.coordinateStatus !== 'verified' ? <InfoBanner
        tone="info"
        text="This navigation target is an offline map reference or user-selected pin, not a locally verified entrance. Confirm signs, gates, and permitted access when you arrive."
      /> : null}
      {state.route?.preference === 'scenic' && state.route.scenicAnchorCount === 0 ? <InfoBanner
        tone="warn"
        text="No curated scenic POI is close enough to this routing graph to change the route, so Scenic currently behaves like Direct."
      /> : null}
      {state.rerouting ? <InfoBanner tone="info" text="LakBai confirmed a route deviation and is recalculating another offline route from your current position." /> : null}
      {state.wrongWay && state.tracking && !state.rerouting ? <InfoBanner
        tone="warn"
        text="Your recent movement is consistently opposite the active route. LakBai waits for sustained movement before recalculating so one noisy heading reading cannot trigger a reroute."
      /> : null}
      {viewModel.offRoute && state.tracking && !state.rerouting ? <InfoBanner
        tone="warn"
        text={`You are about ${Math.round(state.offRouteM ?? 0)} m from the active route. LakBai waits for several reliable GPS fixes before rerouting to avoid reacting to location drift.`}
      /> : null}

      {state.route ? <>
          <NavigationMap
            route={state.route}
            target={state.target}
            offlineBasemapUri={state.offlineBasemapUri}
            liveGps={state.tracking}
            nextManeuver={state.nextManeuver}
            distanceToNextManeuverKm={state.distanceToNextManeuverKm}
            remainingKm={state.remainingKm}
            remainingMin={state.remainingMin}
            rerouting={state.rerouting}
            voiceGuidance={state.voiceGuidance}
            trailPreview={state.trailPreview}
            routePois={state.routePois}
          />

          {state.trailPreview ? <View style={[styles.journeyCard, shadows.soft]}>
              <View style={styles.journeyHeader}>
                <View style={styles.journeyIcon}>
                  <Ionicons name="trail-sign-outline" size={19} color={colors.primary} />
                </View>
                <View style={styles.journeyCopy}>
                  <Text style={styles.journeyEyebrow}>ROAD → VERIFIED TRAIL</Text>
                  <Text style={styles.journeyTitle}>The journey continues after the entrance</Text>
                </View>
              </View>
              <View style={styles.journeySteps}>
                <JourneyStep
                  icon="navigate-outline"
                  label="Offline road route"
                  detail={formatKm(state.route.distanceKm)}
                />
                <Ionicons name="chevron-forward" size={15} color={colors.muted} />
                <JourneyStep
                  icon="location-outline"
                  label="Trail entrance"
                  detail={state.target.label ?? 'Entrance'}
                />
                <Ionicons name="chevron-forward" size={15} color={colors.muted} />
                <JourneyStep
                  icon="footsteps-outline"
                  label="Verified trail"
                  detail={formatKm(state.trailPreview.distanceKm ?? 0)}
                />
              </View>
              <Text style={styles.journeyNote}>
                {state.trailPreview.name} · {formatDurationMinutes(state.trailPreview.durationMin ?? 0)} mapped segment
              </Text>
            </View> : null}

          {state.routePois.length ? <View style={[styles.routePoiCard, shadows.soft]}>
              <View style={styles.routePoiHeader}>
                <View>
                  <Text style={styles.routePoiEyebrow}>OFFLINE PLACES AHEAD</Text>
                  <Text style={styles.routePoiTitle}>Useful stops along this route</Text>
                </View>
                <Ionicons name="compass-outline" size={21} color={colors.primary} />
              </View>
              {state.routePois.map(place => <View key={place.id} style={styles.routePoiRow}>
                  <View style={styles.routePoiIcon}>
                    <Ionicons name="location-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.routePoiCopy}>
                    <Text style={styles.routePoiName}>{place.name}</Text>
                    <Text style={styles.routePoiMeta}>
                      {formatAhead(place.distanceAheadKm)} ahead · {place.category}
                    </Text>
                    {place.tip ? <Text style={styles.routePoiTip} numberOfLines={2}>{place.tip}</Text> : null}
                  </View>
                </View>)}
            </View> : null}

          <View style={styles.summaryRow}>
            <Summary
              icon={state.mode === 'drive' ? 'car-outline' : 'walk-outline'}
              value={formatKm(shownDistanceKm ?? 0)}
              label={state.tracking || state.arrived ? 'Remaining' : 'Route'}
            />
            <Summary
              icon="time-outline"
              value={formatDurationMinutes(shownDurationMin ?? 0)}
              label={state.tracking && state.usingLiveEta ? 'Live ETA' : state.tracking || state.arrived ? 'ETA' : 'Est. time'}
            />
            <Summary
              icon="locate-outline"
              value={state.accuracyM != null ? `±${Math.round(state.accuracyM)} m` : '—'}
              label="GPS"
            />
          </View>

          {state.preview ? <InfoBanner
            tone="warn"
            text="Preview mode starts from a fixed point inside this routing coverage for demonstration only. Clear the preview and use your GPS before real navigation."
          /> : null}

          {!state.preview && !state.arrived ? <View style={[styles.guidanceCard, shadows.card]}>
              <View style={styles.guidanceHeader}>
                <View style={styles.maneuverIcon}>
                  <Ionicons
                    name={maneuverIcon(state.nextManeuver?.kind)}
                    size={25}
                    color={colors.onPrimary}
                  />
                </View>
                <View style={styles.guidanceCopy}>
                  <Text style={styles.guidanceEyebrow}>{state.tracking ? 'NEXT MANEUVER' : 'ROUTE READY'}</Text>
                  <Text style={styles.guidanceTitle}>
                    {state.nextManeuver?.instruction ?? 'Follow the mapped route'}
                  </Text>
                  {state.distanceToNextManeuverKm != null ? <Text style={styles.guidanceDistance}>
                      {formatAhead(state.distanceToNextManeuverKm)} ahead
                    </Text> : null}
                </View>
              </View>

              <ProgressBar percent={state.progressPct} height={8} />
              <View style={styles.progressMeta}>
                <Text style={styles.progressText}>{state.progressPct}% complete</Text>
                <Text style={styles.progressText}>
                  {state.rerouteCount ? `${state.rerouteCount} offline reroute${state.rerouteCount === 1 ? '' : 's'}` : 'No reroutes'}
                </Text>
              </View>

              {!state.tracking ? <PrimaryButton
                label="Start live navigation"
                icon="navigate-outline"
                disabled={state.rerouting}
                onPress={() => void viewModel.startNavigation()}
              /> : <SecondaryButton
                label="Stop live navigation"
                icon="stop-circle-outline"
                onPress={() => viewModel.stopNavigation()}
              />}
              <SecondaryButton
                label={state.voiceGuidance ? 'Mute voice guidance' : 'Enable voice guidance'}
                icon={state.voiceGuidance ? 'volume-high-outline' : 'volume-mute-outline'}
                onPress={() => viewModel.toggleVoiceGuidance()}
              />
            </View> : null}

          {routeSteps.length && !state.arrived ? <View style={[styles.routeStepsCard, shadows.soft]}>
              <View style={styles.routeStepsHeader}>
                <View>
                  <Text style={styles.routeStepsEyebrow}>
                    {state.tracking ? 'UPCOMING DIRECTIONS' : 'ROUTE OVERVIEW'}
                  </Text>
                  <Text style={styles.routeStepsTitle}>
                    {state.tracking ? 'What comes next' : 'Turn-by-turn offline steps'}
                  </Text>
                </View>
                <Ionicons name="list-outline" size={21} color={colors.primary} />
              </View>
              {routeSteps.map((step, index) => <View key={step.id} style={styles.routeStepRow}>
                  <View style={[
                    styles.routeStepIcon,
                    index === 0 && styles.routeStepIconActive,
                  ]}>
                    <Ionicons
                      name={maneuverIcon(step.kind)}
                      size={16}
                      color={index === 0 ? colors.onPrimary : colors.primary}
                    />
                  </View>
                  <View style={styles.routeStepCopy}>
                    <Text style={styles.routeStepInstruction}>{step.instruction}</Text>
                    <Text style={styles.routeStepDistance}>
                      {step.kind === 'depart' && step.distanceAheadKm <= 0.005
                        ? 'Start here'
                        : formatAhead(step.distanceAheadKm) + ' ahead'}
                    </Text>
                  </View>
                </View>)}
              {remainingStepCount > 0 ? <Text style={styles.routeStepsMore}>
                  +{remainingStepCount} more step{remainingStepCount === 1 ? '' : 's'} on this route
                </Text> : null}
            </View> : null}

          {state.arrived ? <View style={[styles.arrivalCard, shadows.card]}>
              <View style={styles.arrivalIcon}>
                <Ionicons name="checkmark-circle" size={30} color={colors.primary} />
              </View>
              <Text style={styles.arrivalEyebrow}>ARRIVED</Text>
              <Text style={styles.arrivalTitle}>{state.target.label ?? state.destinationName}</Text>
              <Text style={styles.arrivalText}>
                LakBai has reached the end of the offline road route. Confirm the physical entrance and posted local signs before continuing.
              </Text>
              {state.trailPreview ? <View style={styles.arrivalTrailMeta}>
                  <Ionicons name="shield-checkmark-outline" size={17} color={colors.primary} />
                  <Text style={styles.arrivalTrailMetaText}>
                    {formatKm(state.trailPreview.distanceKm ?? 0)} verified segment · {formatDurationMinutes(state.trailPreview.durationMin ?? 0)} · offline GPS
                  </Text>
                </View> : null}
              {state.trailId ? <PrimaryButton
                label="Continue in verified Trail Mode"
                icon="trail-sign-outline"
                onPress={() => viewModel.openTrail()}
              /> : null}
            </View> : null}

          <View style={[styles.sourceCard, shadows.soft]}>
            <SectionHeader
              eyebrow="Routing coverage"
              title={state.graphMeta?.name ?? state.coverage ?? 'Local routing graph'}
            />
            <Text style={styles.sourceText}>
              Source: {state.graphMeta?.sourceDataset ?? state.graphMeta?.source ?? 'Saved routing data'}
              {state.graphMeta?.license ? ` · ${state.graphMeta.license}` : ''}.
            </Text>
            <Text style={styles.sourceText}>
              Current graph: {state.graphMeta?.bounds?.join(', ')}. Real signs, closures, private access, and official traffic rules always take precedence.
            </Text>
          </View>

          <SecondaryButton
            label={state.preview ? 'Use my GPS instead' : 'Calculate route again'}
            icon="refresh-outline"
            onPress={() => viewModel.clearRoute()}
          />
        </> : <View style={[styles.actionCard, shadows.card]}>
          <Text style={styles.actionTitle}>
            Calculate an offline {state.mode === 'drive' ? 'driving' : 'walking'} route
          </Text>
          <Text style={styles.actionText}>
            LakBai uses your foreground GPS position and the saved local road/path graph. No route request is sent to Google or another routing server.
          </Text>
          <View style={styles.modeBlock}>
            <Text style={styles.preferenceEyebrow}>TRAVEL MODE</Text>
            <View style={styles.modeRow}>
              <ModeOption
                icon="walk-outline"
                label="Walk"
                selected={state.mode === 'walk'}
                onPress={() => viewModel.setMode('walk')}
              />
              <ModeOption
                icon="car-outline"
                label="Drive"
                selected={state.mode === 'drive'}
                onPress={() => viewModel.setMode('drive')}
              />
            </View>
          </View>
          {state.mode === 'walk' ? <View style={styles.preferenceBlock}>
              <Text style={styles.preferenceEyebrow}>HOW DO YOU WANT TO EXPLORE?</Text>
              <View style={styles.preferenceRow}>
                {routePreferences.map(option => {
                  const selected = state.preference === option.id;
                  return <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={option.label + ' route'}
                    onPress={() => viewModel.setPreference(option.id)}
                    style={({ pressed }) => [
                      styles.preferenceOption,
                      selected && styles.preferenceOptionSelected,
                      pressed && styles.preferenceOptionPressed,
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={19}
                      color={selected ? colors.onPrimary : colors.primary}
                    />
                    <Text style={[
                      styles.preferenceOptionText,
                      selected && styles.preferenceOptionTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </Pressable>;
                })}
              </View>
              <Text style={styles.preferenceDescription}>
                {preferenceDescription(state.preference)}
              </Text>
            </View> : <Text style={styles.drivePilotNote}>
              Driving mode uses the offline graph’s prototype motor-road access and road-class speed estimates. Always follow posted traffic rules, closures, and private-access signs.
            </Text>}
          <PrimaryButton
            label={state.calculating ? 'Calculating…' : 'Route from my GPS'}
            icon="navigate-outline"
            disabled={state.calculating || !state.graph || !state.offlineBasemapUri}
            onPress={() => void viewModel.startFromGps()}
          />
          {state.previewStart ? <>
              <SecondaryButton
                label="Preview offline route"
                icon="map-outline"
                disabled={state.calculating || !state.graph || !state.offlineBasemapUri}
                onPress={() => viewModel.previewRoute()}
              />
              <Text style={styles.previewHint}>Preview uses a fixed point inside this routing coverage and is clearly separated from live GPS navigation.</Text>
            </> : null}
        </View>}
    </ScrollView>;
};

const Summary = ({ icon, value, label }) => (
  <View style={[styles.summaryCard, shadows.soft]}>
    <Ionicons name={icon} size={18} color={colors.primary} />
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const JourneyStep = ({ icon, label, detail }) => (
  <View style={styles.journeyStep}>
    <Ionicons name={icon} size={16} color={colors.primary} />
    <Text style={styles.journeyStepLabel}>{label}</Text>
    <Text style={styles.journeyStepDetail} numberOfLines={1}>{detail}</Text>
  </View>
);

const ModeOption = ({ icon, label, selected, onPress }) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityState={{ checked: selected }}
    accessibilityLabel={label + ' navigation'}
    onPress={onPress}
    style={({ pressed }) => [
      styles.modeOption,
      selected && styles.modeOptionSelected,
      pressed && styles.preferenceOptionPressed,
    ]}
  >
    <Ionicons
      name={icon}
      size={20}
      color={selected ? colors.onPrimary : colors.primary}
    />
    <Text style={[styles.modeOptionText, selected && styles.modeOptionTextSelected]}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.screenGutter,
  },
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1 },
  eyebrow: {
    color: colors.primary,
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  title: {
    marginTop: 2,
    color: colors.text,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11.5,
    fontWeight: '700',
  },
  actionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  actionText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  preferenceBlock: {
    gap: spacing.xs,
  },
  modeBlock: {
    gap: spacing.xs,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  modeOption: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  modeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  modeOptionText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  modeOptionTextSelected: {
    color: colors.onPrimary,
  },
  preferenceEyebrow: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  preferenceRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  preferenceOption: {
    flex: 1,
    minHeight: 62,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
  },
  preferenceOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  preferenceOptionPressed: {
    opacity: 0.82,
  },
  preferenceOptionText: {
    color: colors.text,
    fontSize: 10.5,
    fontWeight: '900',
    textAlign: 'center',
  },
  preferenceOptionTextSelected: {
    color: colors.onPrimary,
  },
  preferenceDescription: {
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 15,
  },
  drivePilotNote: {
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 15,
  },
  previewHint: {
    color: colors.muted,
    fontSize: 9.8,
    lineHeight: 14,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  journeyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
  },
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  journeyIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyCopy: {
    flex: 1,
  },
  journeyEyebrow: {
    color: colors.primary,
    fontSize: 8.8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  journeyTitle: {
    marginTop: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  journeySteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
  },
  journeyStep: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 2,
  },
  journeyStepLabel: {
    color: colors.text,
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  journeyStepDetail: {
    color: colors.muted,
    fontSize: 8.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  journeyNote: {
    color: colors.textSecondary,
    fontSize: 9.8,
    lineHeight: 14,
    textAlign: 'center',
  },
  routePoiCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
  },
  routePoiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  routePoiEyebrow: {
    color: colors.primary,
    fontSize: 8.8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  routePoiTitle: {
    marginTop: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  routePoiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  routePoiIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routePoiCopy: {
    flex: 1,
  },
  routePoiName: {
    color: colors.text,
    fontSize: 11.5,
    fontWeight: '900',
  },
  routePoiMeta: {
    marginTop: 1,
    color: colors.accentDark,
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  routePoiTip: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 9.5,
    lineHeight: 14,
  },
  summaryCard: {
    flex: 1,
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    marginTop: 4,
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  summaryLabel: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 9.5,
    fontWeight: '700',
  },
  guidanceCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.md,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  maneuverIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceCopy: { flex: 1 },
  guidanceEyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.65,
  },
  guidanceTitle: {
    marginTop: 2,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  guidanceDistance: {
    marginTop: 2,
    color: colors.accentDark,
    fontSize: 11,
    fontWeight: '900',
  },
  routeStepsCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
  },
  routeStepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  routeStepsEyebrow: {
    color: colors.primary,
    fontSize: 8.8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  routeStepsTitle: {
    marginTop: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  routeStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routeStepIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeStepIconActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  routeStepCopy: {
    flex: 1,
    minWidth: 0,
  },
  routeStepInstruction: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
  routeStepDistance: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 9.5,
    fontWeight: '700',
  },
  routeStepsMore: {
    color: colors.muted,
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  progressText: {
    color: colors.muted,
    fontSize: 9.8,
    fontWeight: '700',
  },
  arrivalCard: {
    borderWidth: 1,
    borderColor: '#CBE6D5',
    borderRadius: radius.lg,
    backgroundColor: colors.primarySofter,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  arrivalIcon: {
    marginBottom: spacing.xxs,
  },
  arrivalEyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  arrivalTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  arrivalText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  arrivalTrailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  arrivalTrailMetaText: {
    flex: 1,
    color: colors.primary,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  sourceCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.xs,
  },
  sourceText: {
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15,
  },
});
