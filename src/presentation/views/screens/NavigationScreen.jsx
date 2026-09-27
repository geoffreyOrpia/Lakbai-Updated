import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    id: 'easy',
    label: 'Easy',
    icon: 'leaf-outline',
    description: 'Prefer surfaced streets and avoid rough or path-like segments when data allows. Not an accessibility guarantee.',
  },
  {
    id: 'adventure',
    label: 'Adventure',
    icon: 'trail-sign-outline',
    description: 'Prefer walkable paths and tracks when they provide a practical alternative.',
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
        <LoadingState title="Loading offline routing" text="Opening the saved basemap and Panabo routing graph." />
      </View>;
  }

  const shownDistanceKm = state.tracking || state.arrived
    ? state.remainingKm ?? state.route?.distanceKm
    : state.route?.distanceKm;
  const shownDurationMin = state.tracking || state.arrived
    ? state.remainingMin ?? state.route?.durationMin
    : state.route?.durationMin;

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackAction label={state.destinationName || 'Destination'} onPress={() => viewModel.back()} />

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="navigate" size={24} color={colors.onPrimary} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>LAKBAI OFFLINE NAVIGATION</Text>
          <Text style={styles.title}>{state.destinationName}</Text>
          <Text style={styles.subtitle}>
            Walking pilot · Panabo City · {preferenceLabel(state.preference)}
          </Text>
        </View>
      </View>

      <InfoBanner
        tone="info"
        text="LakBai calculates this route on-device from a bundled OpenStreetMap road graph and renders it over the saved PMTiles map. No Google Maps or routing server is required."
      />

      {state.error ? <InfoBanner tone="warn" text={state.error} /> : null}
      {state.gpsError ? <InfoBanner tone="warn" text={state.gpsError} /> : null}
      {state.rerouting ? <InfoBanner tone="info" text="You left the active route. LakBai is recalculating another offline route from your current position." /> : null}
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
          />

          <View style={styles.summaryRow}>
            <Summary
              icon="walk-outline"
              value={formatKm(shownDistanceKm ?? 0)}
              label={state.tracking || state.arrived ? 'Remaining' : 'Route'}
            />
            <Summary
              icon="time-outline"
              value={formatDurationMinutes(shownDurationMin ?? 0)}
              label={state.tracking || state.arrived ? 'ETA' : 'Est. time'}
            />
            <Summary
              icon="locate-outline"
              value={state.accuracyM != null ? `±${Math.round(state.accuracyM)} m` : '—'}
              label="GPS"
            />
          </View>

          {state.preview ? <InfoBanner
            tone="warn"
            text="Preview mode starts from a fixed Panabo city-center point for demonstration only. Clear the preview and use your GPS before real navigation."
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

          {state.arrived ? <View style={[styles.arrivalCard, shadows.card]}>
              <View style={styles.arrivalIcon}>
                <Ionicons name="checkmark-circle" size={30} color={colors.primary} />
              </View>
              <Text style={styles.arrivalEyebrow}>ARRIVED</Text>
              <Text style={styles.arrivalTitle}>{state.target.label ?? state.destinationName}</Text>
              <Text style={styles.arrivalText}>
                LakBai has reached the end of the offline road route. Confirm the physical entrance and posted local signs before continuing.
              </Text>
              {state.trailId ? <PrimaryButton
                label="Continue in verified Trail Mode"
                icon="trail-sign-outline"
                onPress={() => viewModel.openTrail()}
              /> : null}
            </View> : null}

          <View style={[styles.sourceCard, shadows.soft]}>
            <SectionHeader eyebrow="Routing coverage" title="Panabo pilot graph" />
            <Text style={styles.sourceText}>
              Source: HOT OSM Philippines Roads · OpenStreetMap contributors · ODbL 1.0.
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
          <Text style={styles.actionTitle}>Calculate an offline walking route</Text>
          <Text style={styles.actionText}>
            LakBai uses your foreground GPS position and the local Panabo road/path graph. No route request is sent to Google or another routing server.
          </Text>
          <View style={styles.preferenceBlock}>
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
          </View>
          <PrimaryButton
            label={state.calculating ? 'Calculating…' : 'Route from my GPS'}
            icon="navigate-outline"
            disabled={state.calculating || !state.graph || !state.offlineBasemapUri}
            onPress={() => void viewModel.startFromGps()}
          />
          <SecondaryButton
            label="Preview Panabo pilot route"
            icon="map-outline"
            disabled={state.calculating || !state.graph || !state.offlineBasemapUri}
            onPress={() => viewModel.previewPilot()}
          />
          <Text style={styles.previewHint}>Preview uses a fixed Panabo city-center point and is clearly separated from live GPS navigation.</Text>
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
