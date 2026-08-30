import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native';

import { BottomNav } from './src/components/BottomNav';
import { destinationPacks } from './src/data/destinations';
import { AuthScreen, type AuthView } from './src/screens/AuthScreen';
import { DownloadsScreen } from './src/screens/DownloadsScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SafetyScreen } from './src/screens/SafetyScreen';
import { TripsScreen } from './src/screens/TripsScreen';
import {
  authenticateLocalAccount,
  clearSession,
  getSessionEmail,
  registerLocalAccount,
  saveSessionEmail,
} from './src/storage/authStore';
import {
  listDownloadedPackIds,
  removeDownloadedPack,
  saveDownloadedPack,
} from './src/storage/downloadStore';
import { completeOnboarding, hasCompletedOnboarding } from './src/storage/onboardingStore';
import { colors } from './src/theme';
import type { TabKey } from './src/types/navigation';

type AccessMode = 'guest' | 'user' | null;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [accessMode, setAccessMode] = useState<AccessMode>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [onboardingRestored, setOnboardingRestored] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('welcome');
  const [exploreQuery, setExploreQuery] = useState('');
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(
    () => new Set(destinationPacks.filter((pack) => pack.downloaded).map((pack) => pack.id)),
  );

  useEffect(() => {
    let active = true;

    void hasCompletedOnboarding()
      .then((completed) => {
        if (active) setOnboardingComplete(completed);
      })
      .finally(() => {
        if (active) setOnboardingRestored(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void getSessionEmail()
      .then((email) => {
        if (active && email) {
          setUserEmail(email);
          setAccessMode('user');
        }
      })
      .finally(() => {
        if (active) setSessionRestored(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void listDownloadedPackIds()
      .then((ids) => {
        if (active) setDownloadedIds(new Set(ids));
      })
      .catch(() => {
        // Keep the bundled default state when local storage cannot be opened.
      });

    return () => {
      active = false;
    };
  }, []);

  const packs = useMemo(
    () => destinationPacks.map((pack) => ({ ...pack, downloaded: downloadedIds.has(pack.id) })),
    [downloadedIds],
  );

  const downloadPack = async (packId: string) => {
    const pack = destinationPacks.find((item) => item.id === packId);
    if (!pack || pack.status !== 'available') return;

    await saveDownloadedPack(packId);
    setDownloadedIds((current) => {
      const next = new Set(current);
      next.add(packId);
      return next;
    });
  };

  const removePack = async (packId: string) => {
    await removeDownloadedPack(packId);
    setDownloadedIds((current) => {
      const next = new Set(current);
      next.delete(packId);
      return next;
    });
  };

  const openAuth = (view: 'login' | 'register') => {
    setAuthView(view);
    setUserEmail(null);
    setAccessMode(null);
  };

  const openExplore = (query = '') => {
    setExploreQuery(query);
    setActiveTab('explore');
  };

  const logout = async () => {
    await clearSession();
    setUserEmail(null);
    setAccessMode(null);
    setAuthView('welcome');
    setActiveTab('home');
  };

  if (!sessionRestored || !onboardingRestored) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" backgroundColor={colors.offWhite} />
      </SafeAreaView>
    );
  }

  if (!onboardingComplete) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" backgroundColor={colors.offWhite} />
        <OnboardingScreen
          onContinue={() => {
            void completeOnboarding();
            setOnboardingComplete(true);
          }}
        />
      </SafeAreaView>
    );
  }

  if (!accessMode) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" backgroundColor={colors.offWhite} />
        <AuthScreen
          view={authView}
          onViewChange={setAuthView}
          onContinueAsGuest={() => {
            void clearSession();
            setUserEmail(null);
            setAccessMode('guest');
          }}
          onLogin={async (email, password) => {
            const account = await authenticateLocalAccount(email, password);
            await saveSessionEmail(account.email);
            setUserEmail(account.email);
            setAccessMode('user');
          }}
          onRegister={async (name, email, password) => {
            const account = await registerLocalAccount(name, email, password);
            await saveSessionEmail(account.email);
            setUserEmail(account.email);
            setAccessMode('user');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={colors.offWhite} />
      <View style={styles.screen}>
        <View style={styles.content}>
          {renderScreen(
            activeTab,
            setActiveTab,
            accessMode,
            userEmail,
            openAuth,
            packs,
            downloadPack,
            removePack,
            exploreQuery,
            openExplore,
            logout,
          )}
        </View>
        <BottomNav active={activeTab} onChange={setActiveTab} />
      </View>
    </SafeAreaView>
  );
}

function renderScreen(
  activeTab: TabKey,
  onNavigate: (tab: TabKey) => void,
  accessMode: Exclude<AccessMode, null>,
  userEmail: string | null,
  onOpenAuth: (view: 'login' | 'register') => void,
  packs: typeof destinationPacks,
  onDownloadPack: (packId: string) => Promise<void>,
  onRemovePack: (packId: string) => Promise<void>,
  exploreQuery: string,
  onOpenExplore: (query?: string) => void,
  onLogout: () => Promise<void>,
) {
  switch (activeTab) {
    case 'explore':
      return <ExploreScreen initialQuery={exploreQuery} packs={packs} onDownloadPack={onDownloadPack} onRemovePack={onRemovePack} />;
    case 'downloads':
      return <DownloadsScreen packs={packs} onDownloadPack={onDownloadPack} onRemovePack={onRemovePack} />;
    case 'trips':
      return (
        <TripsScreen
          packs={packs}
          isRegistered={accessMode === 'user'}
          ownerKey={userEmail}
          onLoginRequest={() => onOpenAuth('login')}
          onRegisterRequest={() => onOpenAuth('register')}
          onLogout={() => void onLogout()}
        />
      );
    case 'safety':
      return <SafetyScreen />;
    case 'home':
    default:
      return <HomeScreen packs={packs} onNavigate={onNavigate} onOpenExplore={onOpenExplore} />;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 0) : 0,
    backgroundColor: colors.offWhite,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  content: {
    flex: 1,
  },
});
