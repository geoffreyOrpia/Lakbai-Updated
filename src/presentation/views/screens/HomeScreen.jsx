import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from "../components/AppHeader.jsx";
import { DestinationCard } from "../components/DestinationCard.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { SearchField } from "../components/SearchField.jsx";
import { SectionHeader } from "../components/SectionHeader.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
export const HomeScreen = ({
  viewModel
}) => {
  const state = viewModel.state;
  const [searchQuery, setSearchQuery] = useState('');
  const featured = state.items.filter(item => item.destination.featured).slice(0, 3);
  const firstSaved = state.items.find(item => item.saved);
  if (state.loading && !state.items.length) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader />
        <LoadingState title="Preparing your local guides" text="Reading the Davao del Norte catalog and your saved Library state." />
      </ScrollView>;
  }
  if (state.error && !state.items.length) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader />
        <EmptyState icon="alert-circle-outline" title="Home could not load" text={state.error} actionLabel="Try again" onAction={() => void viewModel.load()} />
      </ScrollView>;
  }
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader />

      <View style={styles.intro}>
        <Text style={styles.eyebrow}>DAVAO DEL NORTE</Text>
        <Text style={styles.title}>Explore confidently, even beyond the signal.</Text>
        <Text style={styles.subtitle}>
          Destination guides, trails, and planning tools are stored on your device and work without internet.
        </Text>
      </View>

      <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Search destination packs" onSubmit={value => viewModel.openExplore(value)} />

      <Pressable accessibilityRole="button" accessibilityLabel="Open local library" style={({
      pressed
    }) => [styles.readiness, shadows.card, pressed && styles.pressed]} onPress={() => viewModel.openLibrary()}>
        <View style={styles.readinessIcon}>
          <Ionicons name="cloud-done-outline" size={21} color={colors.primary} />
        </View>
        <View style={styles.readinessCopy}>
          <Text style={styles.readinessTitle}>
            {state.savedCount} {state.savedCount === 1 ? 'pack' : 'packs'} ready offline
          </Text>
          <Text style={styles.readinessText}>
            {firstSaved ? `${firstSaved.destination.name} is saved on this device.` : 'Save a built-in destination pack to your personal library—no internet required.'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>

      <Pressable accessibilityRole="button" accessibilityLabel="Find nearby saved places" style={({
      pressed
    }) => [styles.nearby, shadows.card, pressed && styles.pressed]} onPress={() => viewModel.openNearby()}>
        <View style={styles.nearbyIcon}>
          <Ionicons name="location" size={21} color={colors.accent} />
        </View>
        <View style={styles.readinessCopy}>
          <Text style={styles.nearbyTitle}>Nearby Places</Text>
          <Text style={styles.readinessText}>Use GPS to rank attractions from your saved destination packs—even without internet.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.accent} />
      </Pressable>

      {state.error ? <InfoBanner tone="warn" text={state.error} /> : null}

      <View style={styles.section}>
        <SectionHeader eyebrow="Recommended" title="Start with these packs" actionLabel="Explore all" onAction={() => viewModel.openExplore()} />
        <View style={styles.list}>
          {featured.map(item => <DestinationCard key={item.destination.id} item={item} onPress={() => viewModel.openDestination(item.destination.id)} />)}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Simple flow" title="How LakbayLokal works" />
        <View style={[styles.flowCard, shadows.card]}>
          <FlowStep icon="bookmark-outline" number="01" title="Save" text="Add a pack to your library." />
          <View style={styles.flowDivider} />
          <FlowStep icon="cloud-offline-outline" number="02" title="Explore" text="Read guides without a connection." />
          <View style={styles.flowDivider} />
          <FlowStep icon="navigate-outline" number="03" title="Follow" text="Use saved trails with GPS." />
        </View>
      </View>
    </ScrollView>;
};
const FlowStep = ({
  icon,
  number,
  title,
  text
}) => {
  return <View style={styles.flowStep}>
      <View style={styles.flowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.flowNumber}>{number}</Text>
      <Text style={styles.flowTitle}>{title}</Text>
      <Text style={styles.flowText}>{text}</Text>
    </View>;
};
const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: 128,
    gap: spacing.xl
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
    maxWidth: 560,
    color: colors.text,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '900',
    letterSpacing: -0.9
  },
  subtitle: {
    maxWidth: 600,
    color: colors.muted,
    fontSize: 13.2,
    lineHeight: 19
  },
  readiness: {
    minHeight: 74,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#CBE6D5',
    backgroundColor: colors.primarySofter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  readinessIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center'
  },
  nearby: {
    minHeight: 74,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  nearbyIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  nearbyTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '800'
  },
  readinessCopy: {
    flex: 1
  },
  readinessTitle: {
    color: colors.primaryDark,
    fontSize: 13.5,
    fontWeight: '800'
  },
  readinessText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11.3,
    lineHeight: 15
  },
  section: {
    gap: spacing.sm
  },
  list: {
    gap: spacing.sm
  },
  flowCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    padding: spacing.md
  },
  flowStep: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xs
  },
  flowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs
  },
  flowNumber: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '900'
  },
  flowTitle: {
    marginTop: 2,
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '800'
  },
  flowText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 14
  },
  flowDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 3
  },
  pressed: {
    opacity: 0.85,
    transform: [{
      scale: 0.995
    }]
  }
});
