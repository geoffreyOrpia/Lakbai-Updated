import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppHeader } from '../components/AppHeader';
import { destinationPacks } from '../data/destinations';
import {
  deleteItinerary,
  listItineraries,
  saveItinerary,
  type Itinerary,
  type ItineraryStop,
} from '../storage/itineraryStore';
import { colors, layout, radius, spacing } from '../theme';

type Props = {
  isRegistered: boolean;
  ownerKey: string | null;
  onLoginRequest: () => void;
  onRegisterRequest: () => void;
};

type ViewMode = 'list' | 'create' | 'details';

const availableDestinations = destinationPacks.filter((pack) => pack.status === 'available');

export function TripsScreen({
  isRegistered,
  ownerKey,
  onLoginRequest,
  onRegisterRequest,
}: Props) {
  const [mode, setMode] = useState<ViewMode>('list');
  const [trips, setTrips] = useState<Itinerary[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTrips = useCallback(async () => {
    if (!isRegistered || !ownerKey) {
      setTrips([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      setTrips(await listItineraries(ownerKey));
    } catch {
      setError('Saved itineraries could not be loaded on this device.');
    } finally {
      setLoading(false);
    }
  }, [isRegistered, ownerKey]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  if (!isRegistered || !ownerKey) {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader compact />
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>PERSONAL ITINERARY</Text>
          <Text style={styles.title}>Build your own trip.</Text>
          <Text style={styles.subtitle}>
            Organize curated LakbayLokal destinations into a personal itinerary and keep the plan on your device.
          </Text>
        </View>

        <View style={styles.lockedCard}>
          <View style={styles.largeIcon}>
            <Ionicons name="calendar-outline" size={25} color={colors.forest} />
          </View>
          <Text style={styles.lockedTitle}>Sign in to create itineraries</Text>
          <Text style={styles.lockedText}>
            Guest mode can still browse destinations, download packs, and use offline travel information. An account is only required to create and manage personal trips.
          </Text>
          <Pressable style={({ pressed }) => [styles.primaryButton, styles.lockedActionButton, pressed && styles.pressed]} onPress={onLoginRequest}>
            <Text style={styles.primaryButtonText}>Login</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={onRegisterRequest}>
            <Text style={styles.secondaryButtonText}>Create account</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (mode === 'create') {
    return (
      <CreateTrip
        ownerKey={ownerKey}
        onCancel={() => setMode('list')}
        onSaved={async () => {
          await loadTrips();
          setMode('list');
        }}
      />
    );
  }

  if (mode === 'details' && selectedTrip) {
    return (
      <TripDetails
        trip={selectedTrip}
        onBack={() => {
          setSelectedTrip(null);
          setMode('list');
        }}
        onDelete={async () => {
          setError('');
          try {
            await deleteItinerary(selectedTrip.id, ownerKey);
            setSelectedTrip(null);
            await loadTrips();
            setMode('list');
          } catch {
            setError('The itinerary could not be deleted.');
            setMode('list');
          }
        }}
      />
    );
  }

  const totalStops = trips.reduce((count, trip) => count + trip.stops.length, 0);
  const offlineStops = trips.reduce(
    (count, trip) => count + trip.stops.filter((stop) => destinationPacks.find((pack) => pack.id === stop.destinationId)?.downloaded).length,
    0,
  );

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader compact />

      <View style={styles.tripsHero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>MY TRIPS</Text>
            <Text style={styles.title}>Plan less. Explore more.</Text>
            <Text style={styles.subtitle}>Build personal itineraries from curated destinations and keep the important details available offline.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a new itinerary"
            style={({ pressed }) => [styles.heroCreateButton, pressed && styles.pressed]}
            onPress={() => setMode('create')}
          >
            <Ionicons name="add" size={22} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.tripStatsRow}>
          <TripStat icon="calendar-outline" value={String(trips.length)} label={trips.length === 1 ? 'Trip' : 'Trips'} />
          <View style={styles.statDivider} />
          <TripStat icon="location-outline" value={String(totalStops)} label={totalStops === 1 ? 'Stop' : 'Stops'} />
          <View style={styles.statDivider} />
          <TripStat icon="cloud-done-outline" value={String(offlineStops)} label="Offline" />
        </View>
      </View>

      <View style={styles.localBanner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="phone-portrait-outline" size={18} color={colors.forest} />
        </View>
        <View style={styles.bannerCopy}>
          <Text style={styles.bannerTitle}>Offline-first itinerary</Text>
          <Text style={styles.bannerText}>Trip plans are saved on this device, so your schedule stays accessible even when the signal drops.</Text>
        </View>
        <Ionicons name="checkmark-circle" size={20} color={colors.forest} />
      </View>

      {error ? <MessageBox message={error} danger /> : null}
      {loading ? <Text style={styles.mutedCenter}>Loading saved trips…</Text> : null}

      {!loading && trips.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIllustration}>
            <View style={styles.largeIcon}>
              <Ionicons name="map-outline" size={25} color={colors.forest} />
            </View>
            <View style={styles.emptyRouteLine} />
            <View style={[styles.largeIcon, styles.emptyIconAccent]}>
              <Ionicons name="flag-outline" size={23} color={colors.orange} />
            </View>
          </View>
          <Text style={styles.emptyTitle}>Your next trip starts here</Text>
          <Text style={styles.emptyText}>Create an itinerary, choose curated destinations, and arrange each stop in the order you want to visit.</Text>
          <Pressable style={({ pressed }) => [styles.primaryButton, styles.emptyPrimaryButton, pressed && styles.pressed]} onPress={() => setMode('create')}>
            <Ionicons name="add-circle-outline" size={18} color={colors.white} />
            <Text style={styles.primaryButtonText}>Create first itinerary</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.tripSection}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionKicker}>SAVED ITINERARIES</Text>
              <Text style={styles.sectionTitle}>Upcoming plans</Text>
            </View>
            <Pressable hitSlop={8} onPress={() => setMode('create')}>
              <Text style={styles.sectionAction}>+ New trip</Text>
            </Pressable>
          </View>
          <View style={styles.tripList}>
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onPress={() => {
                  setSelectedTrip(trip);
                  setMode('details');
                }}
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function CreateTrip({
  ownerKey,
  onCancel,
  onSaved,
}: {
  ownerKey: string;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [notes, setNotes] = useState('');
  const [stops, setStops] = useState<ItineraryStop[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedIds = useMemo(() => new Set(stops.map((stop) => stop.destinationId)), [stops]);

  const addStop = (destinationId: string) => {
    const pack = availableDestinations.find((item) => item.id === destinationId);
    if (!pack || selectedIds.has(destinationId)) return;

    setStops((current) => [
      ...current,
      {
        destinationId: pack.id,
        destinationName: pack.name,
        municipality: pack.municipality,
        plannedTime: '',
        note: '',
      },
    ]);
  };

  const updateStop = (index: number, patch: Partial<ItineraryStop>) => {
    setStops((current) => current.map((stop, stopIndex) => (stopIndex === index ? { ...stop, ...patch } : stop)));
  };

  const moveStop = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= stops.length) return;

    setStops((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const submit = async () => {
    const cleanTitle = title.trim();
    const cleanDate = travelDate.trim();

    if (cleanTitle.length < 2) {
      setError('Enter a trip name.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      setError('Use YYYY-MM-DD for the travel date.');
      return;
    }
    if (stops.length === 0) {
      setError('Add at least one destination to the itinerary.');
      return;
    }

    const now = Date.now();
    const trip: Itinerary = {
      id: `trip-${now}-${Math.random().toString(36).slice(2, 8)}`,
      ownerKey,
      title: cleanTitle,
      travelDate: cleanDate,
      notes: notes.trim(),
      stops,
      createdAt: now,
      updatedAt: now,
    };

    setSaving(true);
    setError('');
    try {
      await saveItinerary(trip);
      await onSaved();
    } catch {
      setError('The itinerary could not be saved on this device.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <BackAction label="Cancel" onPress={onCancel} />

      <View style={styles.createHero}>
        <View style={styles.createHeroIcon}>
          <Ionicons name="sparkles-outline" size={20} color={colors.orange} />
        </View>
        <View style={styles.createHeroCopy}>
          <Text style={styles.eyebrow}>NEW ITINERARY</Text>
          <Text style={styles.title}>Build your travel plan</Text>
          <Text style={styles.subtitle}>Start with the essentials, add curated destinations, then arrange your route in the order that works for you.</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.formSectionHeader}>
          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
          <View style={styles.formSectionCopy}>
            <Text style={styles.formSectionTitle}>Trip details</Text>
            <Text style={styles.formSectionText}>Give your itinerary a name and travel date.</Text>
          </View>
        </View>
        <LabeledInput label="Trip name" value={title} onChangeText={setTitle} placeholder="Samal weekend trip" />
        <LabeledInput label="Travel date" value={travelDate} onChangeText={setTravelDate} placeholder="YYYY-MM-DD" />
        <LabeledInput label="Trip notes" value={notes} onChangeText={setNotes} placeholder="Meet-up point, reminders, budget notes…" multiline />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.formSectionHeader}>
          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
          <View style={styles.formSectionCopy}>
            <Text style={styles.formSectionTitle}>Choose destinations</Text>
            <Text style={styles.formSectionText}>Add any available LakbayLokal destination pack to your route.</Text>
          </View>
        </View>
        <View style={styles.destinationList}>
          {availableDestinations.map((pack) => {
            const selected = selectedIds.has(pack.id);
            return (
              <View key={pack.id} style={styles.destinationRow}>
                <View style={styles.destinationIcon}>
                  <Ionicons name="location-outline" size={19} color={colors.forest} />
                </View>
                <View style={styles.destinationCopy}>
                  <Text style={styles.destinationName}>{pack.name}</Text>
                  <Text style={styles.destinationMeta}>{pack.municipality} · {pack.spots} spots</Text>
                </View>
                <Pressable
                  disabled={selected}
                  onPress={() => addStop(pack.id)}
                  style={({ pressed }) => [styles.smallAction, selected && styles.smallActionSelected, pressed && styles.pressed]}
                >
                  <Text style={[styles.smallActionText, selected && styles.smallActionTextSelected]}>{selected ? 'Added' : 'Add'}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.formSectionHeader}>
          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
          <View style={styles.formSectionCopy}>
            <Text style={styles.formSectionTitle}>Arrange your route</Text>
            <Text style={styles.formSectionText}>{stops.length} {stops.length === 1 ? 'stop' : 'stops'} selected · reorder stops anytime before saving.</Text>
          </View>
        </View>
        {stops.length === 0 ? (
          <View style={styles.inlineEmpty}>
            <Text style={styles.inlineEmptyText}>Add destinations above to build the itinerary.</Text>
          </View>
        ) : (
          <View style={styles.stopList}>
            {stops.map((stop, index) => (
              <View key={stop.destinationId} style={styles.stopEditor}>
                <View style={styles.stopHeader}>
                  <View style={styles.orderBadge}><Text style={styles.orderText}>{index + 1}</Text></View>
                  <View style={styles.destinationCopy}>
                    <Text style={styles.destinationName}>{stop.destinationName}</Text>
                    <Text style={styles.destinationMeta}>{stop.municipality}</Text>
                  </View>
                  <View style={styles.orderActions}>
                    <Pressable disabled={index === 0} onPress={() => moveStop(index, -1)} style={({ pressed }) => [styles.iconAction, index === 0 && styles.disabled, pressed && styles.pressed]}>
                      <Ionicons name="arrow-up" size={17} color={colors.forest} />
                    </Pressable>
                    <Pressable disabled={index === stops.length - 1} onPress={() => moveStop(index, 1)} style={({ pressed }) => [styles.iconAction, index === stops.length - 1 && styles.disabled, pressed && styles.pressed]}>
                      <Ionicons name="arrow-down" size={17} color={colors.forest} />
                    </Pressable>
                    <Pressable onPress={() => setStops((current) => current.filter((_, stopIndex) => stopIndex !== index))} style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}>
                      <Ionicons name="trash-outline" size={17} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
                <LabeledInput label="Planned time" value={stop.plannedTime} onChangeText={(value) => updateStop(index, { plannedTime: value })} placeholder="8:30 AM" compact />
                <LabeledInput label="Stop note" value={stop.note} onChangeText={(value) => updateStop(index, { note: value })} placeholder="Optional reminder" compact />
              </View>
            ))}
          </View>
        )}
      </View>

      {error ? <MessageBox message={error} danger /> : null}

      <Pressable disabled={saving} style={({ pressed }) => [styles.primaryButton, saving && styles.disabled, pressed && styles.pressed]} onPress={() => void submit()}>
        <Ionicons name="save-outline" size={18} color={colors.white} />
        <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save itinerary'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function TripStat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.tripStat}>
      <Ionicons name={icon} size={17} color={colors.forest} />
      <View>
        <Text style={styles.tripStatValue}>{value}</Text>
        <Text style={styles.tripStatLabel}>{label}</Text>
      </View>
    </View>
  );
}

function TripCard({ trip, onPress }: { trip: Itinerary; onPress: () => void }) {
  const readyStops = trip.stops.filter((stop) => destinationPacks.find((pack) => pack.id === stop.destinationId)?.downloaded).length;
  const readinessPercent = trip.stops.length ? Math.round((readyStops / trip.stops.length) * 100) : 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tripCard, pressed && styles.pressed]}>
      <View style={styles.tripCardAccent} />
      <View style={styles.tripCardContent}>
        <View style={styles.tripTopRow}>
          <View style={styles.tripDateTile}>
            <Ionicons name="calendar-clear-outline" size={18} color={colors.forest} />
          </View>
          <View style={styles.tripCopy}>
            <Text style={styles.tripTitle}>{trip.title}</Text>
            <Text style={styles.tripMeta}>{formatDate(trip.travelDate)}</Text>
          </View>
          <View style={styles.tripChevron}>
            <Ionicons name="chevron-forward" size={18} color={colors.forest} />
          </View>
        </View>

        <View style={styles.tripCardMetaRow}>
          <View style={styles.tripMetaChip}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text style={styles.tripMetaChipText}>{trip.stops.length} {trip.stops.length === 1 ? 'stop' : 'stops'}</Text>
          </View>
          <View style={styles.tripMetaChip}>
            <Ionicons name="cloud-done-outline" size={14} color={colors.forest} />
            <Text style={[styles.tripMetaChipText, styles.tripMetaChipReady]}>{readyStops} offline-ready</Text>
          </View>
        </View>

        <View style={styles.readinessBlock}>
          <View style={styles.readinessLabelRow}>
            <Text style={styles.readinessLabel}>Offline readiness</Text>
            <Text style={styles.readinessPercent}>{readinessPercent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${readinessPercent}%` }]} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function TripDetails({ trip, onBack, onDelete }: { trip: Itinerary; onBack: () => void; onDelete: () => Promise<void> }) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackAction label="My Trips" onPress={onBack} />
      <View style={styles.detailsHero}>
        <View style={styles.detailsHeroIcon}>
          <Ionicons name="map-outline" size={22} color={colors.forest} />
        </View>
        <Text style={styles.eyebrow}>PERSONAL ITINERARY</Text>
        <Text style={styles.detailsTitle}>{trip.title}</Text>
        <View style={styles.detailsMetaRow}>
          <View style={styles.detailsMetaItem}>
            <Ionicons name="calendar-outline" size={15} color={colors.forest} />
            <Text style={styles.detailsMetaText}>{formatDate(trip.travelDate)}</Text>
          </View>
          <View style={styles.detailsMetaItem}>
            <Ionicons name="location-outline" size={15} color={colors.forest} />
            <Text style={styles.detailsMetaText}>{trip.stops.length} {trip.stops.length === 1 ? 'stop' : 'stops'}</Text>
          </View>
        </View>
        <View style={styles.localDetailPill}>
          <Ionicons name="phone-portrait-outline" size={13} color={colors.forest} />
          <Text style={styles.localDetailText}>Saved locally for offline access</Text>
        </View>
      </View>

      {trip.notes ? (
        <View style={styles.noteCard}>
          <Text style={styles.noteLabel}>TRIP NOTES</Text>
          <Text style={styles.noteText}>{trip.notes}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Itinerary</Text>
        <View style={styles.timeline}>
          {trip.stops.map((stop, index) => (
            <View key={`${trip.id}-${stop.destinationId}-${index}`} style={styles.timelineRow}>
              <View style={styles.timelineMarker}>
                <View style={styles.orderBadge}><Text style={styles.orderText}>{index + 1}</Text></View>
                {index < trip.stops.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>
              <View style={styles.timelineCard}>
                <Text style={styles.destinationName}>{stop.destinationName}</Text>
                <Text style={styles.destinationMeta}>{stop.municipality}</Text>
                {stop.plannedTime ? <Text style={styles.stopTime}>{stop.plannedTime}</Text> : null}
                {stop.note ? <Text style={styles.stopNote}>{stop.note}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      </View>

      <Pressable style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]} onPress={() => void onDelete()}>
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
        <Text style={styles.deleteButtonText}>Delete itinerary</Text>
      </Pressable>
    </ScrollView>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  compact = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        style={[styles.input, multiline && styles.multilineInput, compact && styles.compactInput]}
      />
    </View>
  );
}

function BackAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.backAction, pressed && styles.pressed]}>
      <Ionicons name="arrow-back" size={19} color={colors.forest} />
      <Text style={styles.backActionText}>{label}</Text>
    </Pressable>
  );
}

function MessageBox({ message, danger = false }: { message: string; danger?: boolean }) {
  return (
    <View style={[styles.messageBox, danger && styles.messageBoxDanger]}>
      <Ionicons name={danger ? 'alert-circle-outline' : 'information-circle-outline'} size={17} color={danger ? colors.danger : colors.forest} />
      <Text style={[styles.messageText, danger && styles.messageTextDanger]}>{message}</Text>
    </View>
  );
}

function formatDate(value: string) {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return value;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  intro: { gap: spacing.xs },
  eyebrow: { color: colors.orange, fontSize: 10.5, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: 24, lineHeight: 28, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 12.8, lineHeight: 18 },
  tripsHero: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  heroCopy: { flex: 1, gap: spacing.xs },
  heroCreateButton: { width: 46, height: 46, borderRadius: radius.pill, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  tripStatsRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  tripStat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  tripStatValue: { color: colors.text, fontSize: 15, lineHeight: 17, fontWeight: '900' },
  tripStatLabel: { marginTop: 1, color: colors.muted, fontSize: 9.5, fontWeight: '700' },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  tripSection: { gap: spacing.md },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  sectionKicker: { color: colors.orange, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.7 },
  sectionAction: { color: colors.forest, fontSize: 11.5, fontWeight: '900' },
  lockedCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  largeIcon: { width: 48, height: 48, borderRadius: radius.lg, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  lockedTitle: { color: colors.text, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  lockedText: { color: colors.muted, fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginBottom: spacing.xs },
  localBanner: { minHeight: 72, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.softGreen, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bannerIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  bannerCopy: { flex: 1 },
  bannerTitle: { color: colors.forestDark, fontSize: 12.8, fontWeight: '900' },
  bannerText: { marginTop: 2, color: colors.muted, fontSize: 10.8, lineHeight: 15 },
  tripList: { gap: spacing.sm },
  tripCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden', flexDirection: 'row' },
  tripCardAccent: { width: 4, backgroundColor: colors.forest },
  tripCardContent: { flex: 1, padding: spacing.md, gap: spacing.sm },
  tripTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tripDateTile: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  tripCopy: { flex: 1 },
  tripTitle: { color: colors.text, fontSize: 14.5, fontWeight: '900' },
  tripMeta: { marginTop: 2, color: colors.muted, fontSize: 11.2 },
  tripChevron: { width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  tripCardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tripMetaChip: { minHeight: 28, paddingHorizontal: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.offWhite, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  tripMetaChipText: { color: colors.muted, fontSize: 10.2, fontWeight: '700' },
  tripMetaChipReady: { color: colors.forest },
  readinessBlock: { gap: spacing.xs },
  readinessLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readinessLabel: { color: colors.muted, fontSize: 10.2, fontWeight: '700' },
  readinessPercent: { color: colors.forest, fontSize: 10.5, fontWeight: '900' },
  progressTrack: { height: 5, borderRadius: radius.pill, backgroundColor: colors.softGreen, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.forest },
  emptyCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyIllustration: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  emptyRouteLine: { width: 36, height: 2, backgroundColor: colors.border },
  emptyIconAccent: { backgroundColor: colors.softOrange },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyText: { maxWidth: 300, color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  emptyPrimaryButton: { marginTop: spacing.xs, alignSelf: 'stretch' },
  mutedCenter: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  createHero: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: radius.xl, backgroundColor: colors.softOrange, padding: spacing.lg },
  createHeroIcon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  createHeroCopy: { flex: 1, gap: spacing.xs },
  formCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md },
  sectionCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md },
  formSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  stepBadge: { width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  formSectionCopy: { flex: 1 },
  formSectionTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  formSectionText: { marginTop: 2, color: colors.muted, fontSize: 10.5, lineHeight: 15 },
  fieldGroup: { gap: spacing.xs },
  fieldLabel: { color: colors.text, fontSize: 11, fontWeight: '800' },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.white, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, color: colors.text, fontSize: 13 },
  compactInput: { minHeight: 42, fontSize: 12.5 },
  multilineInput: { minHeight: 82, textAlignVertical: 'top' },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  sectionText: { color: colors.muted, fontSize: 11.5, lineHeight: 16 },
  destinationList: { gap: spacing.sm },
  destinationRow: { minHeight: 64, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  destinationIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  destinationCopy: { flex: 1, minWidth: 0 },
  destinationName: { color: colors.text, fontSize: 12.8, fontWeight: '900' },
  destinationMeta: { marginTop: 2, color: colors.muted, fontSize: 10.5 },
  smallAction: { minWidth: 58, minHeight: 40, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.forest, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  smallActionSelected: { borderColor: colors.border, backgroundColor: colors.softGreen },
  smallActionText: { color: colors.forest, fontSize: 11, fontWeight: '900' },
  smallActionTextSelected: { color: colors.muted },
  stopList: { gap: spacing.sm },
  stopEditor: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.md, gap: spacing.sm },
  stopHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orderBadge: { width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  orderText: { color: colors.white, fontSize: 10.5, fontWeight: '900' },
  orderActions: { flexDirection: 'row', gap: spacing.xxs },
  iconAction: { width: 36, height: 40, borderRadius: radius.md, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  inlineEmpty: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.md },
  inlineEmptyText: { color: colors.muted, fontSize: 11.5, textAlign: 'center' },
  primaryButton: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.forest, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  lockedActionButton: { width: '100%' },
  primaryButtonText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  secondaryButton: { minHeight: 48, width: '100%', borderRadius: radius.md, borderWidth: 1, borderColor: colors.forest, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  secondaryButtonText: { color: colors.forest, fontSize: 13, fontWeight: '900' },
  backAction: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingRight: spacing.sm },
  backActionText: { color: colors.forest, fontSize: 12, fontWeight: '900' },
  detailsHero: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.sm },
  detailsHeroIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  detailsTitle: { color: colors.text, fontSize: 25, lineHeight: 29, fontWeight: '900', letterSpacing: -0.7 },
  detailsMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  detailsMetaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  detailsMetaText: { color: colors.muted, fontSize: 11.2, fontWeight: '700' },
  localDetailPill: { alignSelf: 'flex-start', minHeight: 28, paddingHorizontal: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.softGreen, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  localDetailText: { color: colors.forest, fontSize: 10, fontWeight: '800' },
  noteCard: { borderRadius: radius.lg, backgroundColor: colors.softOrange, padding: spacing.md, gap: spacing.xs },
  noteLabel: { color: colors.orange, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.7 },
  noteText: { color: colors.text, fontSize: 12.3, lineHeight: 18 },
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  timelineMarker: { width: 30, alignItems: 'center' },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.border, minHeight: 20 },
  timelineCard: { flex: 1, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.md },
  stopTime: { marginTop: spacing.xs, color: colors.forest, fontSize: 11, fontWeight: '900' },
  stopNote: { marginTop: spacing.xs, color: colors.muted, fontSize: 11, lineHeight: 16 },
  deleteButton: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  deleteButtonText: { color: colors.danger, fontSize: 12, fontWeight: '900' },
  messageBox: { minHeight: 44, borderRadius: radius.md, backgroundColor: colors.softGreen, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  messageBoxDanger: { backgroundColor: colors.softOrange },
  messageText: { flex: 1, color: colors.forest, fontSize: 11.2, lineHeight: 15, fontWeight: '700' },
  messageTextDanger: { color: colors.danger },
  pressed: { opacity: 0.72 },
});
