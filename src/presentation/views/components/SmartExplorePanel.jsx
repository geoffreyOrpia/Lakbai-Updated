import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SMART_INTEREST_OPTIONS } from "../../../domain/usecases/smartExploreKnowledge.jsx";
import { colors, radius, shadows, spacing } from "../../../theme.jsx";
import { PrimaryButton, SecondaryButton } from "./Buttons.jsx";
import { InfoBanner } from "./InfoBanner.jsx";
import { useFeedback } from "../../../feedback/FeedbackProvider.jsx";

const FilterChip = ({ label, active, onPress, icon }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    accessibilityLabel={label}
    onPress={onPress}
    style={({ pressed }) => [
      styles.filterChip,
      active && styles.filterChipActive,
      pressed && styles.pressed,
    ]}
  >
    {icon ? <Ionicons name={icon} size={14} color={active ? colors.white : colors.textSecondary} /> : null}
    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
  </Pressable>
);

const RecommendationCard = ({ place, selected, onToggle, onOpen }) => (
  <View style={[styles.resultCard, selected && styles.resultCardSelected]}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${place.name} guide`}
      onPress={onOpen}
      style={({ pressed }) => [styles.resultSelect, pressed && styles.pressed]}
    >
      <View style={styles.resultHeading}>
        <View style={styles.resultTitleWrap}>
          <Text style={styles.resultName}>{place.name}</Text>
          <Text style={styles.resultMeta}>
            {place.municipality} · {place.category}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.muted}
        />
      </View>

      <Text style={styles.resultDescription} numberOfLines={2}>{place.description}</Text>

      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.primary} />
          <Text style={styles.badgeText}>{place.sourceReview.label}</Text>
        </View>
        {place.saved ? <View style={styles.badge}>
          <Ionicons name="cloud-done-outline" size={13} color={colors.primary} />
          <Text style={styles.badgeText}>Saved offline</Text>
        </View> : null}
        {place.requiresFerry === true ? <View style={styles.badge}>
          <Ionicons name="boat-outline" size={13} color={colors.accentDark} />
          <Text style={[styles.badgeText, { color: colors.accentDark }]}>Ferry</Text>
        </View> : null}
      </View>

      <View style={styles.reasonList}>
        {place.reasons.slice(0, 3).map(reason => (
          <View key={reason} style={styles.reasonRow}>
            <Ionicons name="checkmark" size={13} color={colors.primary} />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>

      {Number.isFinite(place.routeEstimate?.distanceKm) ? <Text style={styles.routeText}>
        Route estimate: {place.routeEstimate.distanceKm.toFixed(1)} km · ~{Math.max(1, Math.round(place.routeEstimate.durationMin))} min
      </Text> : null}
    </Pressable>

    <SecondaryButton label={selected ? 'Remove from trip' : 'Add to trip'} icon={selected ? 'checkmark-circle' : 'add-circle-outline'} onPress={onToggle} />
  </View>
);

export const SmartExplorePanel = ({ viewModel }) => {
  const state = viewModel.state;
  const results = viewModel.smartResults;
  const { showSnackbar } = useFeedback();
  const selectedCount = state.smartSelectedIds.length;

  const toggleSelection = placeId => {
    const result = viewModel.toggleSmartSelection(placeId);
    if (!result.ok) {
      showSnackbar({ message: result.message, tone: 'error' });
    }
  };

  const buildTrip = () => {
    const ok = viewModel.buildSmartTrip();
    if (!ok && viewModel.state.smartError) {
      showSnackbar({ message: viewModel.state.smartError, tone: 'error' });
    }
  };

  return <View style={styles.shell}>
    <View style={styles.header}>
      <View style={styles.headerIcon}>
        <Ionicons name="sparkles" size={20} color={colors.primary} />
      </View>
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>TRIP IDEAS</Text>
        <Text style={styles.title}>Trip ideas</Text>
        <Text style={styles.subtitle}>
          Choose what you enjoy and find places for your next trip.
        </Text>
      </View>
    </View>

    <SecondaryButton
      label={state.smartOpen ? 'Hide trip ideas' : 'Personalize recommendations'}
      icon={state.smartOpen ? 'chevron-up-outline' : 'options-outline'}
      onPress={() => viewModel.toggleSmartOpen()}
    />

    {state.smartOpen ? <View style={styles.panel}>
      <InfoBanner
        tone="info"
        text="Check opening hours and fees before visiting. Some details are not available yet."
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What are you interested in?</Text>
        <View style={styles.wrap}>
          {SMART_INTEREST_OPTIONS.map(option => (
            <FilterChip
              key={option.key}
              label={option.label}
              active={state.smartPreferences.interests.includes(option.key)}
              onPress={() => viewModel.toggleSmartInterest(option.key)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Travel mode</Text>
        <View style={styles.wrap}>
          <FilterChip
            label="Driving"
            icon="car-outline"
            active={state.smartPreferences.travelMode === 'drive'}
            onPress={() => viewModel.setSmartPreference('travelMode', 'drive')}
          />
          <FilterChip
            label="Walking"
            icon="walk-outline"
            active={state.smartPreferences.travelMode === 'walk'}
            onPress={() => viewModel.setSmartPreference('travelMode', 'walk')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Walking preference</Text>
        <View style={styles.wrap}>
          <FilterChip
            label="Any"
            active={state.smartPreferences.walking === 'any'}
            onPress={() => viewModel.setSmartPreference('walking', 'any')}
          />
          <FilterChip
            label="Prefer easy"
            active={state.smartPreferences.walking === 'easy'}
            onPress={() => viewModel.setSmartPreference('walking', 'easy')}
          />
        </View>
        <Text style={styles.helper}>
          “Easy” only uses LakBai’s existing planning-route difficulty data; it does not claim every path inside a destination is easy.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Journey constraints</Text>
        <View style={styles.wrap}>
          <FilterChip
            label="Ferry okay"
            icon="boat-outline"
            active={state.smartPreferences.ferry === 'allow'}
            onPress={() => viewModel.setSmartPreference('ferry', 'allow')}
          />
          <FilterChip
            label="Avoid ferry"
            icon="remove-circle-outline"
            active={state.smartPreferences.ferry === 'avoid'}
            onPress={() => viewModel.setSmartPreference('ferry', 'avoid')}
          />
          <FilterChip
            label="Saved offline only"
            icon="cloud-done-outline"
            active={state.smartPreferences.savedOnly}
            onPress={() => viewModel.setSmartPreference('savedOnly', !state.smartPreferences.savedOnly)}
          />
        </View>
        {!state.smartFix && state.smartPreferences.ferry === 'avoid' ? <Text style={styles.helper}>
          Enable current location so LakBai can determine whether a mainland–Samal crossing is actually required.
        </Text> : null}
      </View>

      <View style={styles.locationCard}>
        <View style={styles.locationCopy}>
          <Text style={styles.locationTitle}>
            {state.smartFix ? 'Current location enabled' : 'Improve proximity ranking'}
          </Text>
          <Text style={styles.locationText}>
            {state.smartFix
              ? 'LakBai uses your GPS fix locally and refines the strongest matches with the offline routing engine.'
              : 'GPS is optional. Without it, recommendations still use interests, source review, route coverage, and offline readiness.'}
          </Text>
        </View>
        <SecondaryButton
          label={state.smartLocationStatus === 'loading' ? 'Getting location…' : state.smartFix ? 'Refresh GPS' : 'Use my location'}
          icon="locate-outline"
          disabled={state.smartLocationStatus === 'loading'}
          onPress={() => void viewModel.useCurrentLocation()}
        />
        {state.smartRouting ? <View style={styles.routingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.routingText}>Checking travel times…</Text>
        </View> : null}
      </View>

      {state.smartError ? <InfoBanner tone="warn" text={state.smartError} /> : null}

      <View style={styles.resultHeader}>
        <View>
          <Text style={styles.sectionTitle}>Recommended local places</Text>
          <Text style={styles.helper}>
            {results.length} eligible {results.length === 1 ? 'place' : 'places'} · select 2–4 to build a trip
          </Text>
        </View>
        {selectedCount ? <Text style={styles.selectionCount}>{selectedCount}/4 selected</Text> : null}
      </View>

      <View style={styles.results}>
        {results.slice(0, 10).map(place => (
          <RecommendationCard
            key={place.id}
            place={place}
            selected={state.smartSelectedIds.includes(place.id)}
            onToggle={() => toggleSelection(place.id)}
            onOpen={() => viewModel.openSmartDestination(place)}
          />
        ))}
      </View>

      {!results.length ? <InfoBanner
        tone="warn"
        text="No places match yet. Try fewer filters."
      /> : null}

      <PrimaryButton
        label={selectedCount >= 2 ? `Build smart trip · ${selectedCount} stops` : 'Select at least 2 places'}
        icon="map-outline"
        disabled={selectedCount < 2}
        onPress={buildTrip}
      />
      <Text style={styles.footerNote}>
        Generated trips remain editable before saving. Actual navigation recalculates from the live GPS position and preserves the selected POI targets.
      </Text>
    </View> : null}
  </View>;
};

const styles = StyleSheet.create({
  shell: {
    borderWidth: 1,
    borderColor: '#CBE6D5',
    borderRadius: radius.xl,
    backgroundColor: colors.primarySofter,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 17,
  },
  panel: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  filterChipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  helper: {
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15,
  },
  locationCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  locationCopy: {
    gap: 2,
  },
  locationTitle: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '900',
  },
  locationText: {
    color: colors.textSecondary,
    fontSize: 10.5,
    lineHeight: 15,
  },
  routingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  routingText: {
    flex: 1,
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: '700',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  selectionCount: {
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: '900',
  },
  results: {
    gap: spacing.sm,
  },
  resultCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  resultCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySofter,
  },
  resultSelect: {
    gap: spacing.xs,
  },
  resultHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  resultTitleWrap: {
    flex: 1,
  },
  resultName: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '900',
  },
  resultMeta: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 10.5,
    textTransform: 'capitalize',
  },
  resultDescription: {
    color: colors.textSecondary,
    fontSize: 10.5,
    lineHeight: 15,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    minHeight: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 9.5,
    fontWeight: '800',
  },
  reasonList: {
    gap: 3,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  reasonText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 10.5,
    lineHeight: 14,
  },
  routeText: {
    color: colors.primaryDark,
    fontSize: 10.5,
    fontWeight: '800',
  },
  footerNote: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.76,
  },
});
