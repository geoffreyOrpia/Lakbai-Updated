import { ScreenScrollView as ScrollView } from "../components/ScreenScrollView.jsx";
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFeedback } from "../../../feedback/FeedbackProvider.jsx";
import { BackAction, PrimaryButton, SecondaryButton } from "../components/Buttons.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { ProgressBar } from "../components/ProgressBar.jsx";
import { AppHeader } from "../components/AppHeader.jsx";
import { ScreenIntro } from "../components/ScreenIntro.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
import { formatDate } from "../../../core/utils/format.jsx";
export const TripsScreen = ({
  viewModel,
  onOpenSettings
}) => {
  const state = viewModel.state;
  if (state.mode === 'create' || state.mode === 'edit') {
    return <TripEditor viewModel={viewModel} />;
  }
  if (state.mode === 'details' && state.selected) {
    return <TripDetails viewModel={viewModel} trip={state.selected} />;
  }
  return <TripList viewModel={viewModel} onOpenSettings={onOpenSettings} />;
};
const TripList = ({
  viewModel,
  onOpenSettings
}) => {
  const state = viewModel.state;
  const [tripLimit, setTripLimit] = useState(8);
  const totalStops = state.trips.reduce((count, trip) => count + trip.stops.length, 0);
  const offlineStops = state.trips.reduce((count, trip) => count + viewModel.tripReadiness(trip).ready, 0);
  if (state.loading && !state.trips.length) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader onOpenSettings={onOpenSettings} />
        <LoadingState title="Loading your itineraries" text="Reading trips saved on this device." />
      </ScrollView>;
  }
  if (state.error && !state.trips.length) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader onOpenSettings={onOpenSettings} />
        <EmptyState icon="alert-circle-outline" title="Trips could not load" text={state.error} actionLabel="Try again" onAction={() => void viewModel.load()} />
      </ScrollView>;
  }
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader onOpenSettings={onOpenSettings} />

      <ScreenIntro
        eyebrow="MY TRIPS"
        title="Your trips"
        subtitle="Plan, save, and review personal trips stored only on this device."
      />

      <View style={styles.quickStatsRow}>
        <TripStat value={String(state.trips.length)} label={state.trips.length === 1 ? 'Trip' : 'Trips'} />
        <TripStat value={String(totalStops)} label={totalStops === 1 ? 'Stop' : 'Stops'} />
        <TripStat value={String(offlineStops)} label="Offline ready" />
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Create a trip" style={({
      pressed
    }) => [styles.createTripButton, shadows.card, pressed && styles.pressed]} onPress={() => viewModel.openCreate()}>
        <View style={styles.createTripIcon}>
          <Ionicons name="add" size={20} color={colors.onPrimary} />
        </View>
        <View style={styles.createTripCopy}>
          <Text style={styles.createTripTitle}>Create a trip</Text>
          <Text style={styles.createTripText}>Choose destinations and arrange your route.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.onPrimary} />
      </Pressable>

      {state.error ? <InfoBanner tone="danger" text={state.error} /> : null}

      {!state.loading && state.trips.length === 0 ? <EmptyState icon="map-outline" title="No trips yet" text="Create your first trip to organize destinations, times, and notes before you go." /> : <View style={styles.tripSection}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionKicker}>SAVED ITINERARIES</Text>
              <Text style={styles.sectionTitle}>Your trips</Text>
            </View>
          </View>
          <View style={styles.tripList}>
            {state.trips.slice(0, tripLimit).map(trip => <TripCard key={trip.id} trip={trip} readiness={viewModel.tripReadiness(trip)} onPress={() => viewModel.openDetails(trip)} />)}
            {state.trips.length > tripLimit ? <SecondaryButton
              label="Show more trips"
              icon="chevron-down-outline"
              onPress={() => setTripLimit(value => value + 8)}
            /> : null}
          </View>
        </View>}
    </ScrollView>;
};
const TripStat = ({
  value,
  label
}) => {
  return <View style={[styles.tripStat, shadows.soft]}>
      <Text style={styles.tripStatValue}>{value}</Text>
      <Text style={styles.tripStatLabel}>{label}</Text>
    </View>;
};
const TripCard = ({
  trip,
  readiness,
  onPress
}) => {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open itinerary ${trip.title}, ${formatDate(trip.travelDate)}`} onPress={onPress} style={({
    pressed
  }) => [styles.tripCard, shadows.card, pressed && styles.pressed]}>
      <View style={styles.tripCardAccent} />
      <View style={styles.tripCardContent}>
        <View style={styles.tripTopRow}>
          <View style={styles.tripDateTile}>
            <Ionicons name="calendar-clear-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.tripCopy}>
            <Text style={styles.tripTitle}>{trip.title}</Text>
            <Text style={styles.tripMeta}>{formatDate(trip.travelDate)}</Text>
          </View>
          <View style={styles.tripChevron}>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </View>

        <View style={styles.tripCardMetaRow}>
          <View style={styles.tripMetaChip}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text style={styles.tripMetaChipText}>
              {trip.stops.length} {trip.stops.length === 1 ? 'stop' : 'stops'}
            </Text>
          </View>
          <View style={styles.tripMetaChip}>
            <Ionicons name="cloud-done-outline" size={14} color={colors.primary} />
            <Text style={[styles.tripMetaChipText, styles.tripMetaChipReady]}>{readiness.ready} offline-ready</Text>
          </View>
        </View>

        <View style={styles.readinessBlock}>
          <View style={styles.readinessLabelRow}>
            <Text style={styles.readinessLabel}>Offline readiness</Text>
            <Text style={styles.readinessPercent}>{readiness.percent}%</Text>
          </View>
          <ProgressBar percent={readiness.percent} />
          {readiness.missingStops.length ? <Text style={styles.readinessMissing} numberOfLines={2}>
              Save for offline use: {readiness.missingStops.map(stop => stop.destinationName).join(', ')}
            </Text> : <Text style={styles.readinessReady}>All stops are ready offline.</Text>}
        </View>
      </View>
    </Pressable>;
};
const TripEditor = ({
  viewModel
}) => {
  const state = viewModel.state;
  const form = state.form;
  const isEditing = state.mode === 'edit';
  const available = state.destinations.filter(item => item.destination.status === 'available');
  const [destinationLimit, setDestinationLimit] = useState(10);
  const {
    showSnackbar
  } = useFeedback();
  const save = async () => {
    const ok = await viewModel.save();
    showSnackbar({
      message: ok ? isEditing ? 'Itinerary updated.' : 'Itinerary saved to My Trips.' : viewModel.state.error ?? 'The itinerary could not be saved.',
      tone: ok ? 'success' : 'error'
    });
  };
  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <BackAction label={isEditing ? 'Trip details' : 'Cancel'} onPress={() => viewModel.cancelCreate()} />

      <View style={styles.createHero}>
        <View style={styles.createHeroIcon}>
          <Ionicons name="sparkles-outline" size={20} color={colors.accent} />
        </View>
        <View style={styles.createHeroCopy}>
          <Text style={styles.eyebrow}>{isEditing ? 'EDIT ITINERARY' : 'NEW ITINERARY'}</Text>
          <Text style={styles.title}>{isEditing ? 'Refine your travel plan' : 'Build your travel plan'}</Text>
          <Text style={styles.subtitle}>
            {isEditing ? 'Update the details, destinations, timing, and route order while keeping the same saved itinerary.' : 'Name your trip, choose places, and arrange your stops.'}
          </Text>
        </View>
      </View>

      <View style={[styles.formCard, shadows.card]}>
        <SectionBadge step={1} title="Trip details" text="Give your itinerary a name and travel date." />
        <LabeledInput label="Trip name" value={form.title} onChangeText={value => viewModel.setFormField({
        title: value
      })} placeholder="Samal weekend trip" />
        <DateField value={form.travelDate} onChange={value => viewModel.setFormField({
        travelDate: value
      })} />
        <LabeledInput label="Trip notes" value={form.notes} onChangeText={value => viewModel.setFormField({
        notes: value
      })} placeholder="Meet-up point, reminders, budget notes…" multiline />
      </View>

      <View style={[styles.formCard, shadows.card]}>
        <SectionBadge step={2} title="Choose destinations" text="Choose places for your trip." />
        <View style={styles.destinationList}>
          {available.slice(0, destinationLimit).map(item => {
          const added = viewModel.isStopAdded(item.destination.id);
          return <View key={item.destination.id} style={styles.destinationRow}>
                <View style={styles.destinationIcon}>
                  <Ionicons name="location-outline" size={19} color={colors.primary} />
                </View>
                <View style={styles.destinationCopy}>
                  <Text style={styles.destinationName}>{item.destination.name}</Text>
                  <Text style={styles.destinationMeta}>
                    {item.destination.municipality}
                    {item.saved ? ' · offline ready' : ''}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={added ? `${item.destination.name} already added` : `Add ${item.destination.name} to itinerary`} accessibilityState={{
                  disabled: added
                }} disabled={added} onPress={() => viewModel.addStop(item.destination.id, item.destination.name, item.destination.municipality)} style={({
              pressed
            }) => [styles.smallAction, added && styles.smallActionSelected, pressed && !added && styles.pressed]}>
                  <Text style={[styles.smallActionText, added && styles.smallActionTextSelected]}>{added ? 'Added' : 'Add'}</Text>
                </Pressable>
              </View>;
        })}
          {!available.length ? <Text style={styles.emptyText}>No destinations available yet. Connect once to load the catalog.</Text> : null}
          {available.length > destinationLimit ? <SecondaryButton
            label="Show more destinations"
            icon="chevron-down-outline"
            onPress={() => setDestinationLimit(value => value + 10)}
          /> : null}
        </View>
      </View>

      <View style={[styles.formCard, shadows.card]}>
        <SectionBadge step={3} title="Arrange your route" text={`${form.stops.length} ${form.stops.length === 1 ? 'stop' : 'stops'} selected · reorder stops anytime before saving.`} />
        {form.stops.length === 0 ? <View style={styles.inlineEmpty}>
            <Text style={styles.inlineEmptyText}>Add destinations above to build the itinerary.</Text>
          </View> : <View style={styles.stopList}>
            {form.stops.map((stop, index) => <View key={`${stop.destinationId}:${stop.placeId ?? 'destination'}`} style={styles.stopEditor}>
                <View style={styles.stopHeader}>
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderText}>{index + 1}</Text>
                  </View>
                  <View style={styles.destinationCopy}>
                    <Text style={styles.destinationName}>{stop.destinationName}</Text>
                    <Text style={styles.destinationMeta}>{stop.municipality}</Text>
                  </View>
                  <View style={styles.orderActions}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Move ${stop.destinationName} earlier`} accessibilityState={{
                      disabled: index === 0
                    }} disabled={index === 0} onPress={() => viewModel.moveStop(index, -1)} style={({
                pressed
              }) => [styles.iconAction, index === 0 && styles.disabled, pressed && styles.pressed]}>
                      <Ionicons name="arrow-up" size={17} color={colors.primary} />
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Move ${stop.destinationName} later`} accessibilityState={{
                      disabled: index === form.stops.length - 1
                    }} disabled={index === form.stops.length - 1} onPress={() => viewModel.moveStop(index, 1)} style={({
                pressed
              }) => [styles.iconAction, index === form.stops.length - 1 && styles.disabled, pressed && styles.pressed]}>
                      <Ionicons name="arrow-down" size={17} color={colors.primary} />
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${stop.destinationName} from itinerary`} onPress={() => viewModel.removeStop(index)} style={({
                pressed
              }) => [styles.iconAction, pressed && styles.pressed]}>
                      <Ionicons name="trash-outline" size={17} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
                <LabeledInput label="Planned time" value={stop.plannedTime} onChangeText={value => viewModel.updateStop(index, {
            plannedTime: value
          })} placeholder="8:30 AM" compact />
                <LabeledInput label="Stop note" value={stop.note} onChangeText={value => viewModel.updateStop(index, {
            note: value
          })} placeholder="Optional reminder" compact />
              </View>)}
          </View>}
      </View>

      {state.error ? <InfoBanner tone="danger" text={state.error} /> : null}

      <PrimaryButton label={state.busy ? 'Saving…' : isEditing ? 'Update itinerary' : 'Save itinerary'} icon="save-outline" onPress={() => void save()} disabled={state.busy} />
    </ScrollView>;
};
const SectionBadge = ({
  step,
  title,
  text
}) => {
  return <View style={styles.formSectionHeader}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{step}</Text>
      </View>
      <View style={styles.formSectionCopy}>
        <Text style={styles.formSectionTitle}>{title}</Text>
        <Text style={styles.formSectionText}>{text}</Text>
      </View>
    </View>;
};
const DateField = ({
  value,
  onChange
}) => {
  const [open, setOpen] = useState(false);
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date();
  const chooseDate = (event, date) => {
    setOpen(false);
    if (event.type !== 'set' || !date) return;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
  };
  return <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>Travel date</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose travel date" onPress={() => setOpen(true)} style={({
      pressed
    }) => [styles.dateButton, pressed && styles.pressed]}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={[styles.dateText, !value && styles.datePlaceholder]}>{value ? formatDate(value) : 'Choose a date'}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </Pressable>
      {open ? <DateTimePicker value={selectedDate} mode="date" display="default" onChange={chooseDate} /> : null}
    </View>;
};
const LabeledInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  compact = false
}) => {
  return <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.faint} multiline={multiline} style={[styles.input, multiline && styles.multilineInput, compact && styles.compactInput]} />
    </View>;
};
const TripDetails = ({
  viewModel,
  trip
}) => {
  const {
    showSnackbar,
    showHud,
    hideHud,
    showConfirm
  } = useFeedback();
  const readiness = viewModel.tripReadiness(trip);
  const confirmDelete = () => {
    showConfirm({
      title: 'Delete itinerary?',
      message: `${trip.title} will be permanently removed from this device.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: () => {
        showHud('Deleting itinerary…');
        void viewModel.deleteSelected().then(ok => {
          hideHud();
          showSnackbar({
            message: ok ? `${trip.title} deleted.` : 'The itinerary could not be deleted.',
            tone: ok ? 'success' : 'error'
          });
        });
      }
    });
  };
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackAction label="My Trips" onPress={() => viewModel.backToList()} />

      <View style={[styles.detailsHero, shadows.card]}>
        <View style={styles.detailsHeroIcon}>
          <Ionicons name="map-outline" size={22} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>PERSONAL ITINERARY</Text>
        <Text style={styles.detailsTitle}>{trip.title}</Text>
        <View style={styles.detailsMetaRow}>
          <View style={styles.detailsMetaItem}>
            <Ionicons name="calendar-outline" size={15} color={colors.primary} />
            <Text style={styles.detailsMetaText}>{formatDate(trip.travelDate)}</Text>
          </View>
          <View style={styles.detailsMetaItem}>
            <Ionicons name="location-outline" size={15} color={colors.primary} />
            <Text style={styles.detailsMetaText}>
              {trip.stops.length} {trip.stops.length === 1 ? 'stop' : 'stops'}
            </Text>
          </View>
        </View>
        <View style={styles.localDetailPill}>
          <Ionicons name="phone-portrait-outline" size={13} color={colors.primary} />
          <Text style={styles.localDetailText}>Saved locally · {readiness.ready}/{readiness.total} stops offline-ready</Text>
        </View>
      </View>

      {readiness.missingStops.length ? <View style={[styles.missingCard, shadows.soft]}>
          <View style={styles.missingHeader}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.accent} />
            <View style={styles.missingCopy}>
              <Text style={styles.missingTitle}>Finish offline preparation</Text>
              <Text style={styles.missingText}>Save these destination guides to Saved places before traveling without a connection.</Text>
            </View>
          </View>
          <View style={styles.missingList}>
            {readiness.missingStops.map(stop => <Pressable
              key={`${stop.destinationId}:${stop.placeId ?? 'destination'}`}
              accessibilityRole="button"
              accessibilityLabel={`Open ${stop.destinationName} to save it for offline use`}
              onPress={() => viewModel.openDestination(stop.destinationId)}
              style={({ pressed }) => [styles.missingRow, pressed && styles.pressed]}
            >
                <View style={styles.missingRowCopy}>
                  <Text style={styles.missingRowName}>{stop.destinationName}</Text>
                  <Text style={styles.missingRowMeta}>{stop.municipality}</Text>
                </View>
                <View style={styles.missingOpen}>
                  <Text style={styles.missingOpenText}>Open</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </View>
              </Pressable>)}
          </View>
        </View> : <InfoBanner tone="info" text="Every stop in this itinerary is saved to Saved places and ready for offline use." />}

      {trip.notes ? <View style={[styles.noteCard, shadows.soft]}>
          <Text style={styles.noteLabel}>TRIP NOTES</Text>
          <Text style={styles.noteText}>{trip.notes}</Text>
        </View> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Itinerary</Text>
        <View style={styles.timeline}>
          {trip.stops.map((stop, index) => <View key={`${trip.id}-${stop.destinationId}-${index}`} style={styles.timelineRow}>
              <View style={styles.timelineMarker}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>{index + 1}</Text>
                </View>
                {index < trip.stops.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>
              <View style={[styles.timelineCard, shadows.soft]}>
                <Text style={styles.destinationName}>{stop.destinationName}</Text>
                <Text style={styles.destinationMeta}>{stop.municipality}</Text>
                {stop.plannedTime ? <Text style={styles.stopTime}>{stop.plannedTime}</Text> : null}
                {stop.note ? <Text style={styles.stopNote}>{stop.note}</Text> : null}
              </View>
            </View>)}
        </View>
      </View>

      <PrimaryButton
        label="Navigate itinerary"
        icon="navigate-outline"
        disabled={!trip.stops.length}
        onPress={() => {
          const ok = viewModel.navigateTrip(trip);
          if (!ok) {
            showSnackbar({
              message: viewModel.state.error ?? 'This itinerary is not ready for offline navigation.',
              tone: 'error',
            });
          }
        }}
      />
      <SecondaryButton label="Edit itinerary" icon="create-outline" onPress={() => viewModel.openEdit(trip)} />

      <Pressable accessibilityRole="button" accessibilityLabel={`Delete itinerary ${trip.title}`} style={({
      pressed
    }) => [styles.deleteButton, pressed && styles.pressed]} onPress={confirmDelete}>
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
        <Text style={styles.deleteButtonText}>Delete itinerary</Text>
      </Pressable>
    </ScrollView>;
};
const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: layout.tabContentBottom,
    gap: spacing.lg
  },
  intro: {
    gap: spacing.xs
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8
  },
  title: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: -0.7
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12.5,
    lineHeight: 18
  },
  tripsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  tripsHeaderCopy: {
    flex: 1,
    gap: spacing.xs
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  tripStat: {
    flex: 1,
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.xxs
  },
  tripStatValue: {
    color: colors.text,
    fontSize: 23,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.6
  },
  tripStatLabel: {
    color: colors.muted,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  createTripButton: {
    minHeight: 76,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  createTripIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  createTripCopy: {
    flex: 1
  },
  createTripTitle: {
    color: colors.onPrimary,
    fontSize: 13.5,
    fontWeight: '900'
  },
  createTripText: {
    marginTop: 2,
    color: '#D9EDE2',
    fontSize: 10.8,
    lineHeight: 15
  },
  tripSection: {
    gap: spacing.md
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  sectionKicker: {
    color: colors.accent,
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.7
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900'
  },
  tripList: {
    gap: spacing.sm
  },
  tripCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    overflow: 'hidden',
    flexDirection: 'row'
  },
  tripCardAccent: {
    width: 4,
    backgroundColor: colors.primary
  },
  tripCardContent: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm
  },
  tripTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  tripDateTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tripCopy: {
    flex: 1
  },
  tripTitle: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: '900'
  },
  tripMeta: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11.2
  },
  tripChevron: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tripCardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs
  },
  tripMetaChip: {
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs
  },
  tripMetaChipText: {
    color: colors.muted,
    fontSize: 10.2,
    fontWeight: '700'
  },
  tripMetaChipReady: {
    color: colors.primary
  },
  readinessBlock: {
    gap: spacing.xs
  },
  readinessLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  readinessLabel: {
    color: colors.muted,
    fontSize: 10.2,
    fontWeight: '700'
  },
  readinessPercent: {
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: '900'
  },
  readinessMissing: {
    color: colors.accent,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700'
  },
  readinessReady: {
    color: colors.primary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700'
  },
  mutedCenter: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center'
  },
  createHero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.accentSoft,
    padding: spacing.lg
  },
  createHeroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center'
  },
  createHeroCopy: {
    flex: 1,
    gap: spacing.xs
  },
  formCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.md
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepBadgeText: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '900'
  },
  formSectionCopy: {
    flex: 1
  },
  formSectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900'
  },
  formSectionText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15
  },
  fieldGroup: {
    gap: spacing.xs
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800'
  },
  dateButton: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  dateText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700'
  },
  datePlaceholder: {
    color: colors.faint,
    fontWeight: '500'
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 13
  },
  compactInput: {
    minHeight: 42,
    fontSize: 12.5
  },
  multilineInput: {
    minHeight: 82,
    textAlignVertical: 'top'
  },
  destinationList: {
    gap: spacing.sm
  },
  destinationRow: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  destinationIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center'
  },
  destinationCopy: {
    flex: 1,
    minWidth: 0
  },
  destinationName: {
    color: colors.text,
    fontSize: 12.8,
    fontWeight: '900'
  },
  destinationMeta: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 10.5
  },
  smallAction: {
    minWidth: 58,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  smallActionSelected: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted
  },
  smallActionText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900'
  },
  smallActionTextSelected: {
    color: colors.muted
  },
  stopList: {
    gap: spacing.sm
  },
  stopEditor: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  orderText: {
    color: colors.onPrimary,
    fontSize: 10.5,
    fontWeight: '900'
  },
  orderActions: {
    flexDirection: 'row',
    gap: spacing.xxs
  },
  iconAction: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center'
  },
  disabled: {
    opacity: 0.35
  },
  inlineEmpty: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.md
  },
  inlineEmptyText: {
    color: colors.muted,
    fontSize: 11.5,
    textAlign: 'center'
  },
  detailsHero: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.sm
  },
  detailsHeroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center'
  },
  detailsTitle: {
    color: colors.text,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.7
  },
  detailsMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  detailsMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs
  },
  detailsMetaText: {
    color: colors.muted,
    fontSize: 11.2,
    fontWeight: '700'
  },
  localDetailPill: {
    alignSelf: 'flex-start',
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs
  },
  localDetailText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800'
  },
  missingCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    padding: spacing.md,
    gap: spacing.sm
  },
  missingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm
  },
  missingCopy: {
    flex: 1
  },
  missingTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  missingText: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 10.8,
    lineHeight: 15
  },
  missingList: {
    gap: spacing.xs
  },
  missingRow: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  missingRowCopy: {
    flex: 1
  },
  missingRowName: {
    color: colors.text,
    fontSize: 11.5,
    fontWeight: '800'
  },
  missingRowMeta: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 9.8
  },
  missingOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  missingOpenText: {
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: '900'
  },
  noteCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    padding: spacing.md,
    gap: spacing.xs
  },
  noteLabel: {
    color: colors.accentDark,
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.7
  },
  noteText: {
    color: colors.textSecondary,
    fontSize: 12.3,
    lineHeight: 18
  },
  section: {
    gap: spacing.sm
  },
  timeline: {
    gap: 0
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm
  },
  timelineMarker: {
    width: 30,
    alignItems: 'center'
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    minHeight: 20
  },
  timelineCard: {
    flex: 1,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.md
  },
  stopTime: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900'
  },
  stopNote: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16
  },
  deleteButton: {
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
  deleteButtonText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '900'
  },
  emptyText: {
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 16
  },
  pressed: {
    opacity: 0.75
  }
});
