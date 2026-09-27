import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackAction } from "../components/Buttons.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { ProgressBar } from "../components/ProgressBar.jsx";
import { TrailMap } from "../components/TrailMap.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
import { formatDurationMinutes, formatKm } from "../../../core/utils/format.jsx";
export const TrailScreen = ({
  viewModel
}) => {
  const state = viewModel.state;
  const trail = state.trail;
  if (state.loading) {
    return <View style={styles.centerScreen}>
        <Text style={styles.loadingText}>Loading trail…</Text>
      </View>;
  }
  if (!state.hasPack || !trail) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BackAction label="Back" onPress={() => viewModel.back()} />
        <InfoBanner tone="warn" text={state.error ?? 'This trail is unavailable offline.'} />
      </ScrollView>;
  }
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackAction label={state.destinationName} onPress={() => viewModel.back()} />

      <View style={styles.header}>
        <Text style={styles.title}>{trail.name}</Text>
        <View style={styles.statRow}>
          <Stat icon="footsteps-outline" value={formatKm(state.routeDistanceKm || trail.distanceKm)} label="Mapped route" />
          <Stat icon="time-outline" value={formatDurationMinutes(trail.durationMin)} label="Est. time" />
          <Stat icon="cloud-offline-outline" value="Local" label="Map" />
          <Stat icon="barbell-outline" value={trail.difficulty} label="Level" />
        </View>
      </View>

      <TrailMap
        trail={trail}
        tracking={state.tracking}
        offlineBasemapUri={state.offlineBasemapUri}
        height={330}
      />

      {trail.verification ? <View style={[styles.verificationCard, shadows.soft]}>
          <View style={styles.verificationHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <View style={styles.verificationCopy}>
              <Text style={styles.verificationEyebrow}>VERIFIED TRAIL GEOMETRY</Text>
              <Text style={styles.verificationTitle}>{trail.verification.label}</Text>
            </View>
          </View>
          <Text style={styles.verificationText}>{trail.verification.summary}</Text>
          <Text style={styles.verificationMeta}>
            Checked {trail.verification.verifiedAt} · {trail.verification.geometrySource}
          </Text>
        </View> : null}

      {state.tracking ? <View style={[styles.trackingCard, shadows.card]}>
          <View style={styles.trackingHeader}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>GPS LIVE</Text>
            </View>
            <Text style={styles.progressPct}>{state.progressPct}%</Text>
          </View>
          <ProgressBar percent={state.progressPct} height={7} />
          <View style={styles.trackingStats}>
            <Text style={styles.trackingStat}>
              <Text style={styles.trackingStatValue}>{formatKm(state.traveledKm)}</Text> traveled
            </Text>
            <Text style={styles.trackingStat}>
              <Text style={styles.trackingStatValue}>{formatKm(state.remainingKm)}</Text> remaining
            </Text>
            <Text style={styles.trackingStat}>
              <Text style={styles.trackingStatValue}>{state.estimatedRemainingMin ?? 0} min</Text> est.
            </Text>
          </View>
        </View> : null}

      {state.tracking && state.nextWaypoint ? <View style={[styles.nextCard, shadows.card]}>
          <View style={styles.nextIcon}>
            <Ionicons name="navigate" size={19} color={colors.onPrimary} />
          </View>
          <View style={styles.nextCopy}>
            <Text style={styles.nextEyebrow}>NEXT WAYPOINT</Text>
            <Text style={styles.nextName}>{state.nextWaypoint.name}</Text>
            <Text style={styles.nextDistance}>
              {state.distanceToNextWaypointKm != null ? `${Math.max(1, Math.round(state.distanceToNextWaypointKm * 1000))} m along trail` : 'Ahead on the verified route'}
            </Text>
            {state.nextWaypoint.note ? <Text style={styles.nextNote}>{state.nextWaypoint.note}</Text> : null}
          </View>
        </View> : null}

      {state.tracking && state.completed ? <InfoBanner
        tone="success"
        text="You reached the end of this verified mapped trail segment."
      /> : null}

      {state.tracking && state.accuracyM != null ? <InfoBanner tone={viewModel.lowAccuracy ? "warn" : "info"} text={viewModel.lowAccuracy ? `GPS accuracy is about ${Math.round(state.accuracyM)} m. Trail progress and off-route warnings are paused until accuracy improves.` : `GPS accuracy is about ${Math.round(state.accuracyM)} m.`} /> : null}

      {viewModel.offTrail && state.tracking ? <InfoBanner
        tone="warn"
        text={`You are about ${Math.round(state.offTrailM ?? 0)} m from the verified trail line. Move back toward the mapped route and confirm nearby signs before continuing.`}
      /> : null}

      {state.permission === 'denied' ? <InfoBanner tone="danger" text="Location permission was declined. Enable it in system settings to follow the trail with GPS." /> : null}

      {state.gpsError ? <InfoBanner tone="warn" text={state.gpsError} /> : null}

      <View style={styles.controls}>
        {state.tracking ? <StopButton onPress={() => viewModel.stopTracking()} /> : <StartButton onPress={() => void viewModel.startTracking()} />}
      </View>

      <View style={[styles.waypointCard, shadows.card]}>
        <Text style={styles.waypointTitle}>Waypoints</Text>
        <View style={styles.waypointList}>
          {trail.waypoints.map((waypoint, index) => <View key={waypoint.id} style={styles.waypointRow}>
              <View style={styles.waypointMarker}>
                <View style={[styles.waypointDot, waypoint.type === 'end' && styles.waypointDotEnd, waypoint.type === 'start' && styles.waypointDotStart]} />
                {index < trail.waypoints.length - 1 ? <View style={styles.waypointLine} /> : null}
              </View>
              <View style={styles.waypointCopy}>
                <Text style={styles.waypointName}>{waypoint.name}</Text>
                {waypoint.note ? <Text style={styles.waypointNote}>{waypoint.note}</Text> : null}
              </View>
            </View>)}
        </View>
      </View>

      <View style={styles.trailNote}>
        <Ionicons name="navigate-outline" size={17} color={colors.primary} />
        <Text style={styles.trailNoteText}>
          Trail navigation is fully in-app and works from saved map data plus foreground GPS. Phone location can still drift under canopy or near structures, so follow posted signs and local instructions and do not rely on LakbayLokal as an emergency navigation device.
        </Text>
      </View>
    </ScrollView>;
};
const Stat = ({
  icon,
  value,
  label
}) => {
  return <View style={styles.stat}>
      <Ionicons name={icon} size={15} color={colors.primary} />
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>;
};
const StartButton = ({
  onPress
}) => {
  return <Pressable accessibilityRole="button" accessibilityLabel="Start trail navigation" onPress={onPress} style={({
    pressed
  }) => [styles.startButton, shadows.card, pressed && styles.pressed]}>
      <Ionicons name="navigate" size={19} color={colors.onPrimary} />
      <Text style={styles.startButtonText}>Start trail navigation</Text>
    </Pressable>;
};
const StopButton = ({
  onPress
}) => {
  return <Pressable accessibilityRole="button" accessibilityLabel="Stop trail tracking" onPress={onPress} style={({
    pressed
  }) => [styles.stopButton, shadows.card, pressed && styles.pressed]}>
      <Ionicons name="stop-circle-outline" size={19} color={colors.text} />
      <Text style={styles.stopButtonText}>Stop tracking</Text>
    </Pressable>;
};
const styles = StyleSheet.create({
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    color: colors.muted,
    fontSize: 12.5,
    fontWeight: '700'
  },
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg
  },
  header: {
    gap: spacing.sm
  },
  title: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: -0.6
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  stat: {
    flex: 1,
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4
  },
  statValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize'
  },
  statLabel: {
    color: colors.faint,
    fontSize: 8.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  verificationCard: {
    borderWidth: 1,
    borderColor: '#CBE6D5',
    borderRadius: radius.lg,
    backgroundColor: colors.primarySofter,
    padding: spacing.md,
    gap: spacing.xs
  },
  verificationHeader: {
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
    letterSpacing: 0.6
  },
  verificationTitle: {
    marginTop: 2,
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '900'
  },
  verificationText: {
    color: colors.textSecondary,
    fontSize: 10.8,
    lineHeight: 16
  },
  verificationMeta: {
    color: colors.muted,
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: '700'
  },
  trackingCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#CBE6D5',
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  liveBadge: {
    minHeight: 26,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent
  },
  liveText: {
    color: colors.primary,
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6
  },
  progressPct: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900'
  },
  trackingStats: {
    flexDirection: 'row',
    gap: spacing.lg
  },
  trackingStat: {
    color: colors.muted,
    fontSize: 11.5,
    fontWeight: '700'
  },
  trackingStatValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  nextCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm
  },
  nextIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  nextCopy: {
    flex: 1
  },
  nextEyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6
  },
  nextName: {
    marginTop: 2,
    color: colors.text,
    fontSize: 14,
    fontWeight: '900'
  },
  nextDistance: {
    marginTop: 2,
    color: colors.accentDark,
    fontSize: 10.5,
    fontWeight: '900'
  },
  nextNote: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15
  },
  controls: {
    gap: spacing.sm
  },
  startButton: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  startButtonText: {
    color: colors.onPrimary,
    fontSize: 13.5,
    fontWeight: '900'
  },
  stopButton: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  stopButtonText: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '900'
  },
  waypointCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md
  },
  waypointTitle: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: '900',
    marginBottom: spacing.sm
  },
  waypointList: {
    gap: 0
  },
  waypointRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  waypointMarker: {
    width: 22,
    alignItems: 'center'
  },
  waypointDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.primary,
    marginTop: 3
  },
  waypointDotStart: {
    backgroundColor: colors.primary
  },
  waypointDotEnd: {
    borderColor: colors.accent,
    backgroundColor: colors.accent
  },
  waypointLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    minHeight: 18
  },
  waypointCopy: {
    flex: 1,
    marginBottom: spacing.sm
  },
  waypointName: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '800'
  },
  waypointNote: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16
  },
  trailNote: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter
  },
  trailNoteText: {
    flex: 1,
    color: colors.primary,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700'
  },
  pressed: {
    opacity: 0.82,
    transform: [{
      scale: 0.99
    }]
  }
});
