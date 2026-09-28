import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from "../../theme.jsx";
import { getContainer } from "../di/container.jsx";
import { useViewModel } from "../viewmodel/useViewModel.jsx";
import { DestinationViewModel } from "../viewmodels/DestinationViewModel.jsx";
import { LibraryViewModel } from "../viewmodels/LibraryViewModel.jsx";
import { NearbyViewModel } from "../viewmodels/NearbyViewModel.jsx";
import { NavigationViewModel } from "../viewmodels/NavigationViewModel.jsx";
import { ExploreViewModel } from "../viewmodels/ExploreViewModel.jsx";
import { HomeViewModel } from "../viewmodels/HomeViewModel.jsx";
import { OnboardingViewModel } from "../viewmodels/OnboardingViewModel.jsx";
import { SafetyViewModel } from "../viewmodels/SafetyViewModel.jsx";
import { SessionViewModel } from "../viewmodels/SessionViewModel.jsx";
import { TrailViewModel } from "../viewmodels/TrailViewModel.jsx";
import { TripsViewModel } from "../viewmodels/TripsViewModel.jsx";
import { DestinationScreen } from "../views/screens/DestinationScreen.jsx";
import { LibraryScreen } from "../views/screens/LibraryScreen.jsx";
import { NearbyScreen } from "../views/screens/NearbyScreen.jsx";
import { NavigationScreen } from "../views/screens/NavigationScreen.jsx";
import { ExploreScreen } from "../views/screens/ExploreScreen.jsx";
import { HomeScreen } from "../views/screens/HomeScreen.jsx";
import { LandingScreen } from "../views/screens/LandingScreen.jsx";
import { OnboardingScreen } from "../views/screens/OnboardingScreen.jsx";
import { SafetyScreen } from "../views/screens/SafetyScreen.jsx";
import { TrailScreen } from "../views/screens/TrailScreen.jsx";
import { TripsScreen } from "../views/screens/TripsScreen.jsx";
import { BottomNav } from "../views/components/BottomNav.jsx";

/**
 * App shell: device-local setup phases (landing -> onboarding -> main),
 * the tab bar, and a small stack of overlay screens (destination, trail).
 */
export const AppNavigator = () => {
  const container = getContainer();
  const session = useViewModel(() => new SessionViewModel(container.preferencesDeps));
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]);
  const [exploreQuery, setExploreQuery] = useState('');
  const [tripDraft, setTripDraft] = useState(null);
  const push = route => setStack(current => [...current, route]);
  const pop = () => setStack(current => current.slice(0, -1));
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 0) {
        pop();
        return true;
      }
      if (tab !== 'home') {
        setTab('home');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [stack.length, tab]);
  if (session.state.phase === 'restoring') {
    return <View style={styles.splash}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.splashText}>Preparing LakBai…</Text>
      </View>;
  }
  if (session.state.phase === 'landing') {
    return <LandingScreen onContinue={() => session.dismissLanding()} />;
  }
  if (session.state.phase === 'onboarding') {
    return <OnboardingFlow session={session} />;
  }
  const topRoute = stack[stack.length - 1];
  if (topRoute?.name === 'destination') {
    return <DestinationFlow destinationId={topRoute.destinationId} onOpenTrail={trailId => push({
      name: 'trail',
      destinationId: topRoute.destinationId,
      trailId
    })} onOpenNavigation={navigation => push({
      name: 'navigation',
      ...navigation
    })} onPlanRoute={draft => {
      setTripDraft(draft);
      setStack([]);
      setTab('trips');
    }} onBack={pop} />;
  }
  if (topRoute?.name === 'trail') {
    return <TrailFlow destinationId={topRoute.destinationId} trailId={topRoute.trailId} onBack={pop} />;
  }
  if (topRoute?.name === 'navigation') {
    return <NavigationFlow
      route={topRoute}
      onOpenTrail={trailId => push({
        name: 'trail',
        destinationId: topRoute.destinationId,
        trailId
      })}
      onBack={pop}
    />;
  }
  if (topRoute?.name === 'nearby') {
    return <NearbyFlow onOpenDestination={destinationId => push({
      name: 'destination',
      destinationId
    })} onOpenNavigation={navigation => push({
      name: 'navigation',
      ...navigation
    })} onOpenLibrary={() => {
      setStack([]);
      setTab('library');
    }} onBack={pop} />;
  }
  return <View style={styles.screen}>
      <View style={styles.content}>
        {tab === 'home' ? <HomeTab onOpenExplore={query => {
        setExploreQuery(query ?? '');
        setTab('explore');
      }} onOpenLibrary={() => setTab('library')} onOpenDestination={destinationId => push({
        name: 'destination',
        destinationId
      })} onOpenNearby={() => push({
        name: 'nearby'
      })} /> : null}
        {tab === 'explore' ? <ExploreTab initialQuery={exploreQuery} onOpenDestination={destinationId => push({
        name: 'destination',
        destinationId
      })} /> : null}
        {tab === 'trips' ? <TripsTab
          initialRouteDraft={tripDraft}
          onDraftConsumed={() => setTripDraft(null)}
          onOpenDestination={destinationId => push({
            name: 'destination',
            destinationId
          })}
        /> : null}
        {tab === 'library' ? <LibraryTab onOpenDestination={destinationId => push({
        name: 'destination',
        destinationId
      })} /> : null}
        {tab === 'safety' ? <SafetyTab /> : null}
      </View>
      <BottomNav active={tab} onChange={setTab} />
    </View>;
};
const OnboardingFlow = ({
  session
}) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new OnboardingViewModel(container.preferencesDeps, {
    onComplete: () => session.completeOnboarding()
  }));
  return <OnboardingScreen viewModel={viewModel} />;
};
const DestinationFlow = ({
  destinationId,
  onOpenTrail,
  onOpenNavigation,
  onPlanRoute,
  onBack
}) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new DestinationViewModel(container.destinationDeps, destinationId, {
    onOpenTrail,
    onOpenNavigation,
    onPlanRoute,
    onBack
  }, container.directionsDeps));
  return <DestinationScreen viewModel={viewModel} />;
};
const NavigationFlow = ({
  route,
  onOpenTrail,
  onBack
}) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new NavigationViewModel(
    container.routingDeps,
    container.destinationDeps,
    container.locationService,
    route,
    { onBack, onOpenTrail },
  ));
  return <NavigationScreen viewModel={viewModel} />;
};

const TrailFlow = ({
  destinationId,
  trailId,
  onBack
}) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new TrailViewModel(container.destinationDeps, container.locationService, destinationId, trailId, {
    onBack
  }));
  return <TrailScreen viewModel={viewModel} />;
};
const HomeTab = ({
  onOpenExplore,
  onOpenLibrary,
  onOpenDestination,
  onOpenNearby
}) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new HomeViewModel(container.destinationDeps, {
    onOpenExplore,
    onOpenLibrary,
    onOpenDestination,
    onOpenNearby
  }));
  return <HomeScreen viewModel={viewModel} />;
};
const NearbyFlow = ({
  onOpenDestination,
  onOpenNavigation,
  onOpenLibrary,
  onBack
}) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new NearbyViewModel(container.destinationDeps, container.locationService, {
    onOpenDestination,
    onOpenNavigation,
    onOpenLibrary,
    onBack
  }));
  return <NearbyScreen viewModel={viewModel} />;
};
const ExploreTab = ({
  initialQuery,
  onOpenDestination
}) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new ExploreViewModel(
    container.destinationDeps,
    container.onlineResearchDeps,
  ));
  return <ExploreScreen viewModel={viewModel} initialQuery={initialQuery} onOpenDestination={onOpenDestination} />;
};
const LibraryTab = ({
  onOpenDestination
}) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new LibraryViewModel(container.destinationDeps));
  return <LibraryScreen viewModel={viewModel} onOpenDestination={onOpenDestination} />;
};
const TripsTab = ({
  onOpenDestination,
  initialRouteDraft,
  onDraftConsumed
}) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new TripsViewModel(container.tripsDeps, container.destinationDeps, {
    onOpenDestination,
    initialRouteDraft
  }));
  useEffect(() => {
    if (initialRouteDraft) onDraftConsumed?.();
  }, [initialRouteDraft, onDraftConsumed]);
  return <TripsScreen viewModel={viewModel} />;
};
const SafetyTab = () => {
  const container = getContainer();
  const viewModel = useViewModel(() => new SafetyViewModel(container.safetyDeps, container.destinationDeps.packRepository));
  return <SafetyScreen viewModel={viewModel} />;
};
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flex: 1
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.sm
  },
  splashText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700'
  }
});
