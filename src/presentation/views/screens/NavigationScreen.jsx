import { ScreenScrollView as ScrollView } from "../components/ScreenScrollView.jsx";
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { upcomingRouteManeuvers } from "../../../core/routing/routeProgress.jsx";
import { formatKm, formatDurationMinutes } from "../../../core/utils/format.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
import { BackAction, PrimaryButton, SecondaryButton } from "../components/Buttons.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { NavigationMap } from "../components/NavigationMap.jsx";
import { ProgressBar } from "../components/ProgressBar.jsx";
import { Disclosure } from "../components/Disclosure.jsx";
import { SectionHeader } from "../components/SectionHeader.jsx";

const maneuverIcon = kind => {
  if (kind === 'left' || kind === 'sharp-left' || kind === 'slight-left') return 'return-up-back-outline';
  if (kind === 'right' || kind === 'sharp-right' || kind === 'slight-right') return 'return-up-forward-outline';
  if (kind === 'uturn') return 'refresh-outline';
  if (kind === 'roundabout-enter' || kind === 'roundabout-exit') return 'sync-outline';
  if (kind === 'ferry-board' || kind === 'ferry-arrive') return 'boat-outline';
  if (kind === 'trail-enter' || kind === 'trail-waypoint') return 'trail-sign-outline';
  if (kind === 'stop-arrive') return 'location-outline';
  if (kind === 'arrive') return 'flag-outline';
  return 'arrow-up-outline';
};

const formatAhead = km => {
  if (km == null) return '';
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m`;
  return formatKm(km);
};

const formatArrivalTime = minutes => {
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  return new Date(Date.now() + minutes * 60_000).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const routePreferences = Object.freeze([
  {
    id: 'direct',
    label: 'Direct',
    icon: 'flash-outline',
    description: 'Take a direct walking route.',
  },
  {
    id: 'scenic',
    label: 'Scenic',
    icon: 'camera-outline',
    description: 'Pass nearby sights when a suitable route is available.',
  },
  {
    id: 'easy',
    label: 'Easy',
    icon: 'leaf-outline',
    description: 'Prefer paved streets. Steps and uneven ground may still be present.',
  },
  {
    id: 'adventure',
    label: 'Adventure',
    icon: 'trail-sign-outline',
    description: 'Prefer walking paths where available. Check signs and access along the way.',
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
  const [showDestinationSwitcher, setShowDestinationSwitcher] = useState(false);

  if (state.loading) {
    return <View style={styles.center}>
        <LoadingState title="Getting your route ready" text="Opening your saved map." />
      </View>;
  }

  const shownDistanceKm = state.tracking || state.arrived
    ? state.remainingKm ?? state.route?.distanceKm
    : state.route?.distanceKm;
  const ferryJourney = state.route?.type === 'ferry-journey' ? state.route : null;
  const roadTrailJourney = state.route?.type === 'road-trail-journey' ? state.route : null;
  const multiStopJourney = state.route?.type === 'multi-stop-journey' ? state.route : null;
  const hasFerryLeg = Boolean(ferryJourney || multiStopJourney?.ferryLegs?.length);
  const shownDurationMin = ferryJourney
    ? (state.tracking || state.arrived
      ? state.remainingMin ?? ferryJourney.durationMin
      : ferryJourney.durationMin)
    : state.tracking || state.arrived
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
  const gpsAgeSeconds = Number.isFinite(state.fix?.timestamp)
    ? Math.max(0, Math.round((Date.now() - state.fix.timestamp) / 1000))
    : null;
  const recentGpsSource = state.fix?.source === 'last-known' || state.fix?.source === 'persisted';
  const gpsStatus = state.tracking && !state.gpsError
    ? !state.fix
      ? { tone: 'info', text: 'Acquiring GPS. Your route stays ready while LakBai finds your position.' }
      : gpsAgeSeconds != null && gpsAgeSeconds > 15
        ? { tone: 'warn', text: `Last GPS update was ${gpsAgeSeconds} seconds ago. LakBai is reconnecting without resetting your route.` }
        : recentGpsSource
          ? {
            tone: 'info',
            text: `Using a recent location${state.accuracyM != null ? ` (about ${Math.round(state.accuracyM)} m accuracy` : ''}${state.accuracyM != null ? ')' : ''} while GPS refines your position.`,
          }
          : state.accuracyM != null
            ? { tone: 'success', text: `GPS ready · about ${Math.round(state.accuracyM)} m accuracy.` }
            : { tone: 'success', text: 'GPS ready.' }
    : null;
  const estimatedArrival = state.tracking ? formatArrivalTime(shownDurationMin) : null;
  const switchTargets = viewModel.availableSwitchTargets ?? [];

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackAction label={state.destinationName || 'Destination'} onPress={() => viewModel.back()} />

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="navigate" size={24} color={colors.onPrimary} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>DIRECTIONS</Text>
          <Text style={styles.title}>{multiStopJourney ? state.destinationName : state.target?.label ?? state.destinationName}</Text>
          <Text style={styles.subtitle}>
            {state.mode === 'drive' ? 'Driving' : 'Walking'}
            {state.mode === 'walk' ? ' · ' + preferenceLabel(state.preference) : ''}
          </Text>
        </View>
      </View>

      {state.error ? <InfoBanner tone="warn" text={state.error} /> : null}
      {state.gpsError ? <InfoBanner tone="warn" text={state.gpsError} /> : null}
      {gpsStatus ? <InfoBanner tone={gpsStatus.tone} icon="locate" text={gpsStatus.text} /> : null}
      {state.route && !state.tracking && !state.preview && recentGpsSource ? <InfoBanner
        tone="info"
        icon="locate-outline"
        text={`Route starts from a recent location${gpsAgeSeconds != null ? ` from ${gpsAgeSeconds} seconds ago` : ''}. Starting directions will refresh your position.`}
      /> : null}
      {state.backgroundWarning ? <InfoBanner tone="warn" text={state.backgroundWarning} /> : null}
      {state.resumedSession && state.multiStops.length ? <InfoBanner
        tone="info"
        text={`Resumed this saved itinerary at stop ${Math.min(state.completedStopCount + 1, state.multiStops.length)} of ${state.multiStops.length}. Finding your location to continue your trip.`}
      /> : null}
      {hasFerryLeg ? <InfoBanner
        tone="info"
        text="Includes the Panacan–Babak ferry. Allow about 30 minutes for the crossing, plus waiting time. Check departures before leaving."
      /> : null}
      {state.journeyPhase === 'ferry' && state.tracking ? <InfoBanner
        tone="info"
        text="You are on the ferry. Road directions will resume after the crossing."
      /> : null}
      {state.journeyPhase === 'trail' && state.tracking ? <InfoBanner
        tone="info"
        text="Follow the marked trail. LakBai cannot find a different path while you are on this trail."
      /> : null}
      {state.discoveryTarget && state.coordinateStatus !== 'verified' ? <InfoBanner
        tone="info"
        text="The entrance location is not confirmed. Check signs and access when you arrive."
      /> : null}
      {state.route?.preference === 'scenic' && state.route.scenicAnchorCount === 0 ? <InfoBanner
        tone="warn"
        text="No nearby scenic detour was found. Showing the direct route."
      /> : null}
      {state.switchingDestination ? <InfoBanner tone="info" text="Changing destination and calculating from your current location." /> : state.rerouting ? <InfoBanner tone="info" text="Finding a new route from your location." /> : null}
      {state.wrongWay && state.tracking && !state.rerouting ? <InfoBanner
        tone="warn"
        text="You may be heading the wrong way. Check your direction when safe."
      /> : null}
      {viewModel.offRoute && state.tracking && !state.rerouting ? <InfoBanner
        tone="warn"
        text={state.journeyPhase === 'trail'
          ? `You are about ${Math.round(state.offRouteM ?? 0)} m from the trail. Return to the marked trail and follow posted signs.`
          : `You are about ${Math.round(state.offRouteM ?? 0)} m from your route. Checking your location before updating directions.`}
      /> : null}

      {state.route ? <>
          <View style={styles.summaryRow}>
            <Summary
              icon={state.mode === 'drive' ? 'car-outline' : 'walk-outline'}
              value={formatKm(shownDistanceKm ?? 0)}
              label={state.tracking || state.arrived ? 'Remaining' : 'Route'}
            />
            <Summary
              icon="time-outline"
              value={formatDurationMinutes(shownDurationMin ?? 0)}
              label={hasFerryLeg
                ? 'Travel time + ferry wait'
                : state.tracking || state.arrived ? 'Time remaining' : 'Travel time'}
            />
          </View>
          {estimatedArrival ? <View style={styles.arrivalRow}>
              <Ionicons name="time-outline" size={15} color={colors.primary} />
              <Text style={styles.etaText}>
                Estimated arrival {estimatedArrival}{hasFerryLeg ? ' · ferry waits can change this' : ''}
              </Text>
            </View> : null}

          {state.preview ? <>
            <PrimaryButton label="Use my location" icon="locate-outline" onPress={() => void viewModel.startFromGps()} disabled={state.calculating} />
            <InfoBanner
            tone="warn"
            text="This is a sample route, not directions from your location. Choose “Use my location” before traveling."
          />
          </> : null}

          {!state.preview && !state.arrived ? <View style={[styles.guidanceCard, shadows.card]}>
              {!state.tracking ? <View style={styles.guidanceHeader}>
                <View style={styles.maneuverIcon}>
                  <Ionicons
                    name={maneuverIcon(state.nextManeuver?.kind)}
                    size={25}
                    color={colors.onPrimary}
                  />
                </View>
                <View style={styles.guidanceCopy}>
                  <Text style={styles.guidanceEyebrow}>{state.tracking ? 'NEXT DIRECTION' : 'ROUTE READY'}</Text>
                  <Text style={styles.guidanceTitle}>
                    {state.nextManeuver?.instruction ?? 'Follow the mapped route'}
                  </Text>
                  {state.distanceToNextManeuverKm != null ? <Text style={styles.guidanceDistance}>
                      {formatAhead(state.distanceToNextManeuverKm)} ahead
                    </Text> : null}
                </View>
              </View> : null}

              <ProgressBar percent={state.progressPct} height={8} />
              {!state.tracking ? <PrimaryButton
                label="Start directions"
                icon="navigate-outline"
                disabled={state.rerouting}
                onPress={() => void viewModel.startNavigation()}
              /> : <>
                <SecondaryButton
                  label={state.switchingDestination ? 'Changing destination…' : 'Change destination'}
                  icon="swap-horizontal-outline"
                  disabled={state.switchingDestination}
                  onPress={() => setShowDestinationSwitcher(value => !value)}
                />
                <SecondaryButton
                  label="Stop directions"
                  icon="stop-circle-outline"
                  onPress={() => viewModel.stopNavigation()}
                />
              </>}
              <SecondaryButton
                label={state.voiceGuidance ? 'Mute voice guidance' : 'Enable voice guidance'}
                icon={state.voiceGuidance ? 'volume-high-outline' : 'volume-mute-outline'}
                onPress={() => viewModel.toggleVoiceGuidance()}
              />
            </View> : null}

          {state.tracking && showDestinationSwitcher ? <View style={[styles.destinationSwitcher, shadows.card]}>
              <View style={styles.destinationSwitcherHeader}>
                <View style={styles.destinationSwitcherIcon}>
                  <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.destinationSwitcherCopy}>
                  <Text style={styles.destinationSwitcherTitle}>Change destination</Text>
                  <Text style={styles.destinationSwitcherText}>Your new route starts from your current GPS position.</Text>
                </View>
              </View>
              {switchTargets.length ? <View style={styles.destinationSwitcherList}>
                  {switchTargets.map(option => <Pressable
                    key={option.destinationId}
                    accessibilityRole="button"
                    accessibilityLabel={'Change destination to ' + option.destinationName}
                    disabled={state.switchingDestination}
                    onPress={() => void viewModel.switchDestination(option).then(result => {
                      if (result.ok) setShowDestinationSwitcher(false);
                    })}
                    style={({ pressed }) => [
                      styles.destinationSwitchOption,
                      pressed && !state.switchingDestination && styles.preferenceOptionPressed,
                    ]}
                  >
                    <View style={styles.destinationSwitchCopy}>
                      <Text style={styles.destinationSwitchName}>{option.destinationName}</Text>
                      <Text style={styles.destinationSwitchArea}>{option.area ?? option.target.label}</Text>
                    </View>
                    <Ionicons name="navigate-outline" size={17} color={colors.primary} />
                  </Pressable>)}
                </View> : <Text style={styles.destinationSwitcherEmpty}>No other offline destinations are available yet.</Text>}
            </View> : null}

          <NavigationMap            onStop={() => viewModel.stopNavigation()}
            onToggleVoice={() => viewModel.toggleVoiceGuidance()}
            route={state.route}
            target={state.route.finalTarget ?? state.target}
            offlineBasemapUri={state.offlineBasemapUri}
            liveGps={state.tracking}
            mode={state.mode}
            currentPosition={state.fix}
            distanceAlongKm={state.distanceAlongKm}
            completedStopCount={state.completedStopCount}
            nextManeuver={state.nextManeuver}
            distanceToNextManeuverKm={state.distanceToNextManeuverKm}
            remainingKm={state.remainingKm}
            remainingMin={state.remainingMin}
            rerouting={state.rerouting}
            routeDeviated={viewModel.offRoute}
            voiceGuidance={state.voiceGuidance}
            trailPreview={state.trailPreview}
            places={state.offlinePois}
            routePois={state.routePois}
            alternativeBaseRoute={state.alternativeBaseRoute}
            alternativeRoutes={state.alternativeRoutes}
            timeIsReference={hasFerryLeg}
          />

          <Disclosure title="Route details and other options">
          {ferryJourney ? <View style={[styles.journeyCard, shadows.soft]}>
              <View style={styles.journeyHeader}>
                <View style={styles.journeyIcon}>
                  <Ionicons name="boat-outline" size={19} color={colors.primary} />
                </View>
                <View style={styles.journeyCopy}>
                  <Text style={styles.journeyEyebrow}>ROAD → FERRY → ROAD</Text>
                  <Text style={styles.journeyTitle}>Your ferry connection</Text>
                </View>
              </View>
              <View style={styles.journeySteps}>
                <JourneyStep
                  icon={state.mode === 'drive' ? 'car-outline' : 'walk-outline'}
                  label="To terminal"
                  detail={ferryJourney.ferryLeg.originTerminal.name}
                />
                <Ionicons name="chevron-forward" size={15} color={colors.muted} />
                <JourneyStep
                  icon="boat-outline"
                  label="Ferry"
                  detail={formatKm(ferryJourney.ferryLeg.distanceKm)}
                />
                <Ionicons name="chevron-forward" size={15} color={colors.muted} />
                <JourneyStep
                  icon="navigate-outline"
                  label="Resume roads"
                  detail={ferryJourney.ferryLeg.targetTerminal.name}
                />
              </View>
              <Text style={styles.journeyNote}>
                {formatDurationMinutes(ferryJourney.roadDurationMin)} road time · {formatDurationMinutes(ferryJourney.ferryDurationMin ?? 0)} estimated crossing · queue/departure time not included
              </Text>
            </View> : null}

          {roadTrailJourney ? <View style={[styles.journeyCard, shadows.soft]}>
              <View style={styles.journeyHeader}>
                <View style={styles.journeyIcon}>
                  <Ionicons name="trail-sign-outline" size={19} color={colors.primary} />
                </View>
                <View style={styles.journeyCopy}>
                  <Text style={styles.journeyEyebrow}>ROAD → TRAIL</Text>
                  <Text style={styles.journeyTitle}>Continue onto the walking trail</Text>
                </View>
              </View>
              <View style={styles.journeySteps}>
                <JourneyStep
                  icon="navigate-outline"
                  label="Road route"
                  detail={formatKm(roadTrailJourney.legs?.find(leg => leg.kind === 'road')?.route?.distanceKm ?? 0)}
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
                  label="Mapped trail"
                  detail={formatKm(roadTrailJourney.trailLeg?.distanceKm ?? 0)}
                />
              </View>
              <Text style={styles.journeyNote}>
                {roadTrailJourney.trail.name} · directions continue along the mapped trail
              </Text>
            </View> : null}

          {multiStopJourney ? <View style={[styles.journeyCard, shadows.soft]}>
              <View style={styles.journeyHeader}>
                <View style={styles.journeyIcon}>
                  <Ionicons name="git-commit-outline" size={19} color={colors.primary} />
                </View>
                <View style={styles.journeyCopy}>
                  <Text style={styles.journeyEyebrow}>MULTI-STOP ROUTE</Text>
                  <Text style={styles.journeyTitle}>
                    {state.completedStopCount} of {state.multiStops.length} stops completed
                  </Text>
                </View>
              </View>
              <View style={styles.multiStopList}>
                {multiStopJourney.journeyLegs.map(leg => {
                  const marker = multiStopJourney.stopOffsets.find(item => item.stopIndex === leg.stopIndex);
                  const completed = leg.stopIndex < state.completedStopCount;
                  const ferryLeg = leg.kind === 'ferry-journey';
                  return <View key={`journey-leg-${leg.stopIndex}`} style={styles.multiStopRow}>
                      <View style={[
                        styles.multiStopIcon,
                        completed && styles.multiStopIconComplete,
                      ]}>
                        <Ionicons
                          name={completed ? 'checkmark' : ferryLeg ? 'boat-outline' : 'location-outline'}
                          size={16}
                          color={completed ? colors.onPrimary : colors.primary}
                        />
                      </View>
                      <View style={styles.multiStopCopy}>
                        <Text style={styles.multiStopTitle}>
                          Stop {leg.stopIndex + 1}: {marker?.stop?.name ?? 'Itinerary stop'}
                        </Text>
                        <Text style={styles.multiStopMeta}>
                          {formatKm(leg.route.distanceKm)} · {formatDurationMinutes(leg.route.durationMin)}
                          {ferryLeg ? ' plus ferry waiting time' : ''}
                        </Text>
                      </View>
                    </View>;
                })}
              </View>
              <Text style={styles.journeyNote}>
                {formatKm(multiStopJourney.distanceKm)} total · {formatDurationMinutes(multiStopJourney.durationMin)}{hasFerryLeg ? ' estimated travel time · ferry waiting time varies' : ' estimated travel time'}
              </Text>
            </View> : null}

          {state.routePois.length ? <View style={[styles.routePoiCard, shadows.soft]}>
              <View style={styles.routePoiHeader}>
                <View>
                  <Text style={styles.routePoiEyebrow}>PLACES ALONG THE WAY</Text>
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

          {!state.tracking && !state.arrived && !['ferry-journey', 'multi-stop-journey'].includes(state.route?.type) ? <View style={[styles.journeyCard, shadows.soft]}>
              <View style={styles.journeyHeader}>
                <View style={styles.journeyIcon}>
                  <Ionicons name="git-branch-outline" size={19} color={colors.primary} />
                </View>
                <View style={styles.journeyCopy}>
                  <Text style={styles.journeyEyebrow}>ALTERNATIVE ROUTES</Text>
                  <Text style={styles.journeyTitle}>Other routes</Text>
                </View>
              </View>
              <Text style={styles.journeyNote}>
                Compare available routes before you leave.
              </Text>
              <SecondaryButton
                label={state.alternativesLoading
                  ? 'Finding alternatives…'
                  : state.alternativeRoutes.length
                  ? 'Refresh alternatives'
                  : 'Find alternatives'}
                icon="git-branch-outline"
                disabled={state.alternativesLoading}
                onPress={() => void viewModel.findAlternatives()}
              />
              {state.alternativeBaseRoute ? <View style={styles.alternativeList}>
                  <AlternativeRouteOption
                    label="Primary route"
                    route={state.alternativeBaseRoute}
                    selected={!state.selectedAlternativeId}
                    onPress={() => viewModel.selectAlternative('primary')}
                  />
                  {state.alternativeRoutes.map((candidate, index) => <AlternativeRouteOption
                    key={candidate.alternativeId}
                    label={`Alternative ${index + 1}`}
                    route={candidate}
                    selected={state.selectedAlternativeId === candidate.alternativeId}
                    onPress={() => viewModel.selectAlternative(candidate.alternativeId)}
                    deltaKm={candidate.distanceDeltaKm}
                    deltaMin={candidate.durationDeltaMin}
                  />)}
                  {!state.alternativeRoutes.length ? <Text style={styles.alternativeEmpty}>
                      No other suitable route was found.
                    </Text> : null}
                </View> : null}
            </View> : null}

          {routeSteps.length && !state.arrived ? <View style={[styles.routeStepsCard, shadows.soft]}>
              <View style={styles.routeStepsHeader}>
                <View>
                  <Text style={styles.routeStepsEyebrow}>
                    {state.tracking ? 'UPCOMING DIRECTIONS' : 'ROUTE OVERVIEW'}
                  </Text>
                  <Text style={styles.routeStepsTitle}>
                    {state.tracking ? 'What comes next' : 'Directions'}
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

          </Disclosure>

          {state.arrived ? <View style={[styles.arrivalCard, shadows.card]}>
              <View style={styles.arrivalIcon}>
                <Ionicons name="checkmark-circle" size={30} color={colors.primary} />
              </View>
              <Text style={styles.arrivalEyebrow}>ARRIVED</Text>
              <Text style={styles.arrivalTitle}>{state.route?.finalTarget?.label ?? state.target.label ?? state.destinationName}</Text>
              <Text style={styles.arrivalText}>
                {roadTrailJourney
                  ? 'You have reached the end of this mapped trail. Follow local signs if you continue.'
                  : 'You have reached the end of your route. Check nearby signs for your destination.'}
              </Text>
              {roadTrailJourney ? <View style={styles.arrivalTrailMeta}>
                  <Ionicons name="shield-checkmark-outline" size={17} color={colors.primary} />
                  <Text style={styles.arrivalTrailMetaText}>
                    {formatKm(roadTrailJourney.trailLeg.distanceKm)} mapped trail · {formatDurationMinutes(roadTrailJourney.trailLeg.durationMin)}
                  </Text>
                </View> : null}
              {!roadTrailJourney && state.trailId ? <PrimaryButton
                label="Open walking trail"
                icon="trail-sign-outline"
                onPress={() => viewModel.openTrail()}
              /> : null}
            </View> : null}

          <Disclosure title="Map information">
          <View style={[styles.sourceCard, shadows.soft]}>
            <SectionHeader
              eyebrow="Map information"
              title="About this map"
            />
            <Text style={styles.sourceText}>
              Source: {state.graphMeta?.sourceDataset ?? state.graphMeta?.source ?? 'Saved routing data'}
              {state.graphMeta?.license ? ` · ${state.graphMeta.license}` : ''}.
            </Text>
            <Text style={styles.sourceText}>
              Follow local signs, closures, and access rules. Map information may be out of date.
            </Text>
          </View>

          </Disclosure>

          <SecondaryButton
            label="Change route"
            icon="refresh-outline"
            onPress={() => viewModel.clearRoute()}
          />
        </> : <View style={[styles.actionCard, shadows.card]}>
          <Text style={styles.actionTitle}>
            Find a {state.mode === 'drive' ? 'driving' : 'walking'} route
          </Text>
          <Text style={styles.actionText}>
            Choose how you are traveling. Directions use your location and work without internet.
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
          {state.mode === 'walk' ? <Disclosure title={'Walking route · ' + preferenceLabel(state.preference)}><View style={styles.preferenceBlock}>
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
            </View></Disclosure> : <Text style={styles.drivePilotNote}>
              Travel times are estimates. Follow road signs, closures, and access rules.
            </Text>}
          <PrimaryButton
            label={state.calculating ? 'Calculating…' : 'Find my route'}
            icon="navigate-outline"
            disabled={state.calculating || !state.graph || !state.offlineBasemapUri}
            onPress={() => void viewModel.startFromGps()}
          />
          {state.previewStart ? <>
              <SecondaryButton
                label="See a sample route"
                icon="map-outline"
                disabled={state.calculating || !state.graph || !state.offlineBasemapUri}
                onPress={() => viewModel.previewRoute()}
              />
              <Text style={styles.previewHint}>Sample routes do not start from your current location.</Text>
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

const AlternativeRouteOption = ({
  label,
  route,
  selected,
  onPress,
  deltaKm = null,
  deltaMin = null,
}) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityState={{ checked: selected }}
    accessibilityLabel={`${label}, ${formatKm(route.distanceKm)}, ${formatDurationMinutes(route.durationMin)}`}
    onPress={onPress}
    style={({ pressed }) => [
      styles.alternativeRow,
      selected && styles.alternativeRowSelected,
      pressed && styles.preferenceOptionPressed,
    ]}
  >
    <View style={[styles.alternativeRadio, selected && styles.alternativeRadioSelected]}>
      {selected ? <View style={styles.alternativeRadioDot} /> : null}
    </View>
    <View style={styles.alternativeCopy}>
      <Text style={styles.alternativeTitle}>{label}</Text>
      <Text style={styles.alternativeMeta}>
        {formatKm(route.distanceKm)} · {formatDurationMinutes(route.durationMin)}
        {deltaKm != null && deltaKm > 0.01 ? ` · +${formatKm(deltaKm)}` : ''}
        {deltaMin != null && deltaMin > 0.4 ? ` · +${Math.round(deltaMin)} min` : ''}
      </Text>
    </View>
    <Ionicons name={selected ? 'checkmark-circle' : 'chevron-forward'} size={18} color={colors.primary} />
  </Pressable>
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
  arrivalRow: {
    minHeight: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  etaText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '800',
  },
  destinationSwitcher: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
  },
  destinationSwitcherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  destinationSwitcherIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationSwitcherCopy: {
    flex: 1,
  },
  destinationSwitcherTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  destinationSwitcherText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  destinationSwitcherList: {
    gap: spacing.xs,
  },
  destinationSwitchOption: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  destinationSwitchCopy: {
    flex: 1,
  },
  destinationSwitchName: {
    color: colors.text,
    fontSize: 11.5,
    fontWeight: '900',
  },
  destinationSwitchArea: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 9.8,
    lineHeight: 13,
  },
  destinationSwitcherEmpty: {
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15,
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
  alternativeList: {
    gap: spacing.xs,
  },
  alternativeRow: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  alternativeRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySofter,
  },
  alternativeRadio: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alternativeRadioSelected: {
    borderColor: colors.primary,
  },
  alternativeRadioDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  alternativeCopy: {
    flex: 1,
    minWidth: 0,
  },
  alternativeTitle: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '900',
  },
  alternativeMeta: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 10.2,
    lineHeight: 14,
  },
  alternativeEmpty: {
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: 'center',
    paddingVertical: spacing.xs,
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
  multiStopList: {
    gap: spacing.xs,
  },
  multiStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  multiStopIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiStopIconComplete: {
    backgroundColor: colors.primary,
  },
  multiStopCopy: {
    flex: 1,
    minWidth: 0,
  },
  multiStopTitle: {
    color: colors.text,
    fontSize: 11.2,
    fontWeight: '900',
  },
  multiStopMeta: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 9.5,
    lineHeight: 13,
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
