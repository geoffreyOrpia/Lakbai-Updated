import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, StyleSheet, Text, View } from 'react-native';
import { navigationRequestFromSession } from "../../data/repositories/navigationSessionRepository.jsx";
import { colors, layout, spacing } from "../../theme.jsx";
import { getContainer } from "../di/container.jsx";
import { useViewModel } from "../viewmodel/useViewModel.jsx";
import { AssistantViewModel } from "../viewmodels/AssistantViewModel.jsx";
import { DestinationViewModel } from "../viewmodels/DestinationViewModel.jsx";
import { LibraryViewModel } from "../viewmodels/LibraryViewModel.jsx";
import { NearbyViewModel } from "../viewmodels/NearbyViewModel.jsx";
import { NavigationViewModel } from "../viewmodels/NavigationViewModel.jsx";
import { ExploreViewModel } from "../viewmodels/ExploreViewModel.jsx";
import { HomeViewModel } from "../viewmodels/HomeViewModel.jsx";
import { OnboardingViewModel } from "../viewmodels/OnboardingViewModel.jsx";
import { SafetyViewModel } from "../viewmodels/SafetyViewModel.jsx";
import { SessionViewModel } from "../viewmodels/SessionViewModel.jsx";
import { SettingsViewModel } from "../viewmodels/SettingsViewModel.jsx";
import { TrailViewModel } from "../viewmodels/TrailViewModel.jsx";
import { TripsViewModel } from "../viewmodels/TripsViewModel.jsx";
import { AssistantScreen } from "../views/screens/AssistantScreen.jsx";
import { DestinationScreen } from "../views/screens/DestinationScreen.jsx";
import { LibraryScreen } from "../views/screens/LibraryScreen.jsx";
import { NearbyScreen } from "../views/screens/NearbyScreen.jsx";
import { NavigationScreen } from "../views/screens/NavigationScreen.jsx";
import { ExploreScreen } from "../views/screens/ExploreScreen.jsx";
import { HomeScreen } from "../views/screens/HomeScreen.jsx";
import { LandingScreen } from "../views/screens/LandingScreen.jsx";
import { OnboardingScreen } from "../views/screens/OnboardingScreen.jsx";
import { SafetyScreen } from "../views/screens/SafetyScreen.jsx";
import { SettingsScreen } from "../views/screens/SettingsScreen.jsx";
import { TrailScreen } from "../views/screens/TrailScreen.jsx";
import { TripsScreen } from "../views/screens/TripsScreen.jsx";
import { ScreenActiveContext } from "../views/components/ScreenScrollView.jsx";
import { BottomNav } from "../views/components/BottomNav.jsx";
import { FloatingAssistantGuide } from "../views/components/FloatingAssistantGuide.jsx";


/**
 * App shell: device-local setup phases (landing -> onboarding -> main),
 * the tab bar, and a small stack of overlay screens (destination, trail).
 */
export const AppNavigator = () => {
  const container = getContainer();
  const session = useViewModel(() => new SessionViewModel(container.preferencesDeps));
  const [tab, setTab] = useState('home');
  const tripBackHandler = useRef(null);
  const [stack, setStack] = useState([]);
  const nextRouteId = useRef(0);
  const activeNavigationRestoreChecked = useRef(false);
  const [exploreQuery, setExploreQuery] = useState('');
  const [tripDraft, setTripDraft] = useState(null);
  const restartAppSetup = async () => {
    await session.restartSetup();
    setTab('home');
    setStack([]);
    setExploreQuery('');
    setTripDraft(null);
    tripBackHandler.current = null;
    nextRouteId.current = 0;
  };
  const push = route => {
    const entry = { ...route, screenKey: ++nextRouteId.current };
    setStack(current => [...current, entry]);
  };
  const pop = () => setStack(current => current.slice(0, -1));
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 0) {
        pop();
        return true;
      }
      if (tab === 'trips' && tripBackHandler.current?.()) return true;
      if (tab !== 'home') {
        setTab('home');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [stack.length, tab]);
  useEffect(() => {
    if (session.state.phase !== 'main' || activeNavigationRestoreChecked.current) return undefined;
    activeNavigationRestoreChecked.current = true;
    let cancelled = false;
    void container.routingDeps.navigationSessionRepository?.getActiveSession()
      .then(saved => {
        if (cancelled) return;
        const navigation = navigationRequestFromSession(saved);
        if (!navigation) return;
        const entry = {
          name: 'navigation',
          ...navigation,
          screenKey: ++nextRouteId.current,
        };
        setStack(current => current.length ? current : [entry]);
      })
      .catch(() => {
        // A recovery failure must not block the normal Home experience.
      });
    return () => {
      cancelled = true;
    };
  }, [container.routingDeps.navigationSessionRepository, session.state.phase]);
  if (session.state.phase === 'restoring') {
    return <View
        accessibilityRole="progressbar"
        accessibilityLabel="Preparing LakBai"
        accessibilityLiveRegion="polite"
        style={styles.splash}
      >
        <Image
          source={require('../../../assets/lakbai-loading.png')}
          style={styles.splashLogo}
          resizeMode="contain"
          accessibilityLabel="LakBai. Explore Davao del Norte."
        />
        <View style={styles.splashStatus}>
          <ActivityIndicator size="small" color={colors.primary} />
          <View style={styles.splashCopy}>
            <Text style={styles.splashTitle}>Preparing LakBai</Text>
            <Text style={styles.splashText}>Loading your places, trips, and saved maps…</Text>
          </View>
        </View>
      </View>;
  }
  if (session.state.phase === 'landing') {
    return <LandingScreen onContinue={() => session.dismissLanding()} />;
  }
  if (session.state.phase === 'onboarding') {
    return <OnboardingFlow session={session} />;
  }
  const renderRoute = (route, active) => {
    if (route?.name === 'destination') {
      return <DestinationFlow destinationId={route.destinationId} onOpenTrail={trailId => push({
        name: 'trail',
        destinationId: route.destinationId,
        trailId
      })} onOpenNavigation={navigation => push({
        name: 'navigation',
        ...navigation
      })} onPlanRoute={draft => {
        setTripDraft(draft);
        setStack([]);
        setTab('trips');
      }} onBack={pop} />;
    } else if (route?.name === 'trail') {
      return <TrailFlow destinationId={route.destinationId} trailId={route.trailId} onBack={pop} />;
    } else if (route?.name === 'navigation') {
      return <NavigationFlow
        active={active}
        route={route}
        onOpenTrail={trailId => push({
          name: 'trail',
          destinationId: route.destinationId,
          trailId
        })}
        onBack={pop}
      />;
    } else if (route?.name === 'assistant') {
      return <AssistantFlow
        destinationId={route.destinationId ?? null}
        onOpenDestination={destinationId => push({ name: 'destination', destinationId })}
        onOpenNavigation={navigation => push({ name: 'navigation', ...navigation })}
        onPlanTrip={draft => {
          setTripDraft(draft);
          setStack([]);
          setTab('trips');
        }}
        onBack={pop}
      />;
    } else if (route?.name === 'settings') {
      return <SettingsFlow
        onBack={pop}
        onRestartSetup={restartAppSetup}
      />;
    } else if (route?.name === 'nearby') {
      return <NearbyFlow active={active} onOpenDestination={destinationId => push({
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
    return null;
  };
  const hasOverlay = stack.length > 0;
  const topRoute = hasOverlay ? stack[stack.length - 1] : null;
  const showAssistantGuide = !['assistant', 'navigation'].includes(topRoute?.name);
  const assistantDestinationId = topRoute?.destinationId ?? null;
  return <View style={styles.screen}>
    <View style={[styles.content, hasOverlay && styles.hidden]} accessibilityElementsHidden={hasOverlay} importantForAccessibility={hasOverlay ? 'no-hide-descendants' : 'auto'}>
      <View style={styles.content}>
        <RetainedTab visible={tab === 'home' && !hasOverlay}><HomeTab active={tab === 'home' && !hasOverlay} onOpenSettings={() => push({ name: 'settings' })} onOpenExplore={query => {
        setExploreQuery(query ?? '');
        setTab('explore');
      }} onOpenLibrary={() => setTab('library')} onOpenDestination={destinationId => push({
        name: 'destination',
        destinationId
      })} onOpenNearby={() => push({
        name: 'nearby'
      })} /></RetainedTab>
        <RetainedTab visible={tab === 'explore' && !hasOverlay}><ExploreTab active={tab === 'explore' && !hasOverlay}
          onOpenSettings={() => push({ name: 'settings' })}
          initialQuery={exploreQuery}
          onOpenDestination={destinationId => push({
            name: 'destination',
            destinationId
          })}
          onPlanTrip={draft => {
            setTripDraft(draft);
            setExploreQuery('');
            setTab('trips');
          }}
        /></RetainedTab>
        <RetainedTab visible={tab === 'trips' && !hasOverlay}><TripsTab active={tab === 'trips' && !hasOverlay} backHandlerRef={tripBackHandler}
          onOpenSettings={() => push({ name: 'settings' })}
          initialRouteDraft={tripDraft}
          onDraftConsumed={() => setTripDraft(null)}
          onOpenDestination={destinationId => push({
            name: 'destination',
            destinationId
          })}
          onOpenNavigation={navigation => push({
            name: 'navigation',
            ...navigation
          })}
        /></RetainedTab>
        <RetainedTab visible={tab === 'library' && !hasOverlay}><LibraryTab active={tab === 'library' && !hasOverlay} onOpenSettings={() => push({ name: 'settings' })} onOpenDestination={destinationId => push({
        name: 'destination',
        destinationId
      })} /></RetainedTab>
        <RetainedTab visible={tab === 'safety' && !hasOverlay}><SafetyTab
          active={tab === 'safety' && !hasOverlay}
          onOpenSettings={() => push({ name: 'settings' })}
          onOpenDestination={destinationId => push({
            name: 'destination',
            destinationId,
          })}
        /></RetainedTab>
      </View>
      <BottomNav active={tab} onChange={setTab} />
    </View>
    {stack.map((route, index) => {
      const active = index === stack.length - 1;
      return <View
        key={route.screenKey}
        style={[styles.content, !active && styles.hidden]}
        pointerEvents={active ? 'auto' : 'none'}
        accessibilityElementsHidden={!active}
        importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      >
          <ScreenActiveContext.Provider value={active}>{renderRoute(route, active)}</ScreenActiveContext.Provider>
        </View>;
    })}
    <FloatingAssistantGuide
      visible={showAssistantGuide}
      bottomOffset={hasOverlay ? spacing.md : layout.tabBarHeight + spacing.lg}
      onPress={() => push({
        name: 'assistant',
        ...(assistantDestinationId ? { destinationId: assistantDestinationId } : {}),
      })}
    />
  </View>;
};
// Keep visited tabs mounted so search, scroll, and unfinished forms survive a detour.
const RetainedTab = ({ visible, children }) => {
  const visited = useRef(false);
  if (visible) visited.current = true;
  return <View style={[styles.content, !visible && styles.hidden]} accessibilityElementsHidden={!visible} importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}>
      <ScreenActiveContext.Provider value={visible}>{visited.current ? children : null}</ScreenActiveContext.Provider>
    </View>;
};

const useRefreshOnReturn = (viewModel, active) => {
  const visited = useRef(false);
  useEffect(() => {
    if (!active) return;
    if (visited.current) void viewModel.load();
    visited.current = true;
  }, [active, viewModel]);
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
const AssistantFlow = ({
  destinationId,
  onOpenDestination,
  onOpenNavigation,
  onPlanTrip,
  onBack
}) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new AssistantViewModel(
    container.destinationDeps,
    container.locationService,
    { onOpenDestination, onOpenNavigation, onPlanTrip, onBack },
    destinationId,
    container.preferencesDeps,
  ));
  return <AssistantScreen viewModel={viewModel} />;
};
const NavigationFlow = ({
  active,
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
  useEffect(() => {
    if (!active) viewModel.stopNavigation();
  }, [active, viewModel]);
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
  active,
  onOpenExplore,
  onOpenLibrary,
  onOpenDestination,
  onOpenNearby,
  onOpenSettings
}) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new HomeViewModel(container.destinationDeps, {
    onOpenExplore,
    onOpenLibrary,
    onOpenDestination,
    onOpenNearby
  }));
  useRefreshOnReturn(viewModel, active);
  return <HomeScreen viewModel={viewModel} onOpenSettings={onOpenSettings} />;
};
const NearbyFlow = ({
  active,
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
  const visited = useRef(false);
  useEffect(() => {
    if (!active) return;
    if (visited.current) void viewModel.refreshSavedPlaces();
    visited.current = true;
  }, [active, viewModel]);
  return <NearbyScreen viewModel={viewModel} />;
};
const ExploreTab = ({
  active,
  initialQuery,
  onOpenDestination,
  onPlanTrip,
  onOpenSettings,
}) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new ExploreViewModel(
    container.destinationDeps,
    container.onlineResearchDeps,
    container.routingDeps,
    container.locationService,
    { onOpenDestination, onPlanTrip },
  ));
  useRefreshOnReturn(viewModel, active);
  return <ExploreScreen viewModel={viewModel} initialQuery={initialQuery} onOpenDestination={onOpenDestination} onOpenSettings={onOpenSettings} />;
};
const LibraryTab = ({
  active,
  onOpenDestination,
  onOpenSettings
}) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new LibraryViewModel(container.destinationDeps));
  useRefreshOnReturn(viewModel, active);
  return <LibraryScreen viewModel={viewModel} onOpenDestination={onOpenDestination} onOpenSettings={onOpenSettings} />;
};
const TripsTab = ({
  active,
  backHandlerRef,
  onOpenDestination,
  onOpenNavigation,
  initialRouteDraft,
  onDraftConsumed,
  onOpenSettings
}) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new TripsViewModel(container.tripsDeps, container.destinationDeps, {
    onOpenDestination,
    onOpenNavigation,
  }));
  useEffect(() => {
    backHandlerRef.current = viewModel.handleBack;
    return () => { backHandlerRef.current = null; };
  }, [backHandlerRef, viewModel]);
  useEffect(() => {
    if (initialRouteDraft) {
      viewModel.importRouteDraft(initialRouteDraft);
      onDraftConsumed?.();
    }
  }, [initialRouteDraft, onDraftConsumed, viewModel]);
  useRefreshOnReturn(viewModel, active);
  return <TripsScreen viewModel={viewModel} onOpenSettings={onOpenSettings} />;
};
const SafetyTab = ({ active, onOpenSettings, onOpenDestination }) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new SafetyViewModel(container.safetyDeps, container.destinationDeps.packRepository));
  useRefreshOnReturn(viewModel, active);
  return <SafetyScreen
    viewModel={viewModel}
    onOpenSettings={onOpenSettings}
    onOpenDestination={onOpenDestination}
  />;
};
const SettingsFlow = ({ onBack, onRestartSetup }) => {
  const container = getContainer();
  const viewModel = useViewModel(() => new SettingsViewModel(
    container.preferencesDeps,
    container.destinationDeps,
    container.routingDeps,
    {
      onBack,
      onRestartSetup,
    },
  ));
  return <SettingsScreen viewModel={viewModel} />;
};
const styles = StyleSheet.create({
  hidden: { display: 'none' },
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
    backgroundColor: '#FBF7EF',
    paddingHorizontal: spacing.xl,
    gap: spacing.md
  },
  splashLogo: {
    width: 184,
    height: 184,
    marginBottom: spacing.xs
  },
  splashStatus: {
    width: '100%',
    maxWidth: 340,
    minHeight: 82,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  splashCopy: {
    flex: 1
  },
  splashTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900'
  },
  splashText: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '700'
  },
});
