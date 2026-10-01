import { ScreenScrollView as ScrollView } from "../components/ScreenScrollView.jsx";
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from "../components/AppHeader.jsx";
import { DestinationCard } from "../components/DestinationCard.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { InfoBanner } from "../components/InfoBanner.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { SearchField } from "../components/SearchField.jsx";
import { SectionHeader } from "../components/SectionHeader.jsx";
import { ScreenIntro } from "../components/ScreenIntro.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";
export const HomeScreen = ({
  viewModel,
  onOpenSettings
}) => {
  const state = viewModel.state;
  const [searchQuery, setSearchQuery] = useState('');
  const featured = state.items.filter(item => item.destination.featured).slice(0, 3);
  if (state.loading && !state.items.length) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader onOpenSettings={onOpenSettings} />
        <LoadingState title="Loading places" />
      </ScrollView>;
  }
  if (state.error && !state.items.length) {
    return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader onOpenSettings={onOpenSettings} />
        <EmptyState icon="alert-circle-outline" title="Home could not load" text={state.error} actionLabel="Try again" onAction={() => void viewModel.load()} />
      </ScrollView>;
  }
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader onOpenSettings={onOpenSettings} />

      <ScreenIntro
        eyebrow="DAVAO DEL NORTE"
        title="Find your next destination"
        subtitle="Discover places across Davao del Norte, plan a trip, and navigate with saved maps."
      />

      <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Search places" onSubmit={value => viewModel.openExplore(value)} />

      <Pressable accessibilityRole="button" accessibilityLabel="Open nearby places" style={({
      pressed
    }) => [styles.nearby, shadows.card, pressed && styles.pressed]} onPress={() => viewModel.openNearby()}>
        <View style={styles.nearbyIcon}>
          <Ionicons name="location" size={21} color={colors.accent} />
        </View>
        <View style={styles.readinessCopy}>
          <Text style={styles.nearbyTitle}>Nearby places</Text>
          <Text style={styles.readinessText}>Search tourism places and streets around you.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.accent} />
      </Pressable>

      {state.error ? <InfoBanner tone="warn" text={state.error} /> : null}

      <View style={styles.section}>
        <SectionHeader eyebrow="Recommended" title="Places to explore" actionLabel="Explore all" onAction={() => viewModel.openExplore()} />
        <View style={styles.list}>
          {featured.map(item => <DestinationCard key={item.destination.id} item={item} onPress={() => viewModel.openDestination(item.destination.id)} />)}
        </View>
      </View>

    </ScrollView>;
};
const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: layout.tabContentBottom,
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
  pressed: {
    opacity: 0.85,
    transform: [{
      scale: 0.995
    }]
  }
});
