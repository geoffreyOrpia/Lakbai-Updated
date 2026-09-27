import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatKm, formatDurationMinutes } from "../../../core/utils/format.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
import { BackAction, PrimaryButton, SecondaryButton } from "../components/Buttons.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { NavigationMap } from "../components/NavigationMap.jsx";
import { SectionHeader } from "../components/SectionHeader.jsx";

export const NavigationScreen = ({ viewModel }) => {
  const state = viewModel.state;

  if (state.loading) {
    return <View style={styles.center}>
        <LoadingState title="Loading offline routing" text="Opening the saved basemap and Panabo routing graph." />
      </View>;
  }

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackAction label={state.destinationName || 'Destination'} onPress={() => viewModel.back()} />

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="navigate" size={24} color={colors.onPrimary} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>LAKBAI OFFLINE NAVIGATION</Text>
          <Text style={styles.title}>{state.destinationName}</Text>
          <Text style={styles.subtitle}>Walking pilot · Panabo City</Text>
        </View>
      </View>

      <InfoBanner
        tone="info"
        text="This is LakBai’s first road-routing pilot. Route calculation happens on-device from a bundled OpenStreetMap road graph and the saved PMTiles basemap."
      />

      {state.error ? <InfoBanner tone="warn" text={state.error} /> : null}

      {state.route ? <>
          <NavigationMap
            route={state.route}
            target={state.target}
            offlineBasemapUri={state.offlineBasemapUri}
            liveGps={!state.preview}
          />

          <View style={styles.summaryRow}>
            <Summary icon="walk-outline" value={formatKm(state.route.distanceKm)} label="Route" />
            <Summary icon="time-outline" value={formatDurationMinutes(state.route.durationMin)} label="Est. time" />
            <Summary icon="cloud-offline-outline" value="Local" label="Routing" />
          </View>

          {state.preview ? <InfoBanner
            tone="warn"
            text="Preview mode starts from Panabo city center for demonstration only. It is not using your live GPS position."
          /> : <InfoBanner
            tone="success"
            text={`GPS snapped ${Math.round(state.route.startSnap.distanceKm * 1000)} m to the mapped road/path network. Destination snap is ${Math.round(state.route.endSnap.distanceKm * 1000)} m.`}
          />}

          <View style={[styles.sourceCard, shadows.soft]}>
            <SectionHeader eyebrow="Routing coverage" title="Panabo pilot graph" />
            <Text style={styles.sourceText}>
              Source: HOT OSM Philippines Roads · OpenStreetMap contributors · ODbL 1.0.
            </Text>
            <Text style={styles.sourceText}>
              Current graph: {state.graphMeta?.bounds?.join(', ')}. Real signs, closures, private access, and official traffic rules always take precedence.
            </Text>
          </View>

          <SecondaryButton label="Calculate again" icon="refresh-outline" onPress={() => viewModel.clearRoute()} />
        </> : <View style={[styles.actionCard, shadows.card]}>
          <Text style={styles.actionTitle}>Calculate an offline walking route</Text>
          <Text style={styles.actionText}>
            LakBai will use your foreground GPS position and the local Panabo road/path graph. No route request is sent to Google or another routing server.
          </Text>
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
          <Text style={styles.previewHint}>Preview uses Panabo city center as a clearly labeled demonstration start point.</Text>
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
