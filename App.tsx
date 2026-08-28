import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

import { BottomNav } from './src/components/BottomNav';
import { AuthScreen, type AuthView } from './src/screens/AuthScreen';
import { DownloadsScreen } from './src/screens/DownloadsScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SafetyScreen } from './src/screens/SafetyScreen';
import { TripsScreen } from './src/screens/TripsScreen';
import { colors } from './src/theme';
import type { TabKey } from './src/types/navigation';

type AccessMode = 'guest' | 'user' | null;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [accessMode, setAccessMode] = useState<AccessMode>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authView, setAuthView] = useState<AuthView>('welcome');

  const openAuth = (view: 'login' | 'register') => {
    setAuthView(view);
    setUserEmail(null);
    setAccessMode(null);
  };

  if (!accessMode) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" backgroundColor={colors.offWhite} />
        <AuthScreen
          view={authView}
          onViewChange={setAuthView}
          onContinueAsGuest={() => {
            setUserEmail(null);
            setAccessMode('guest');
          }}
          onLogin={(email) => {
            setUserEmail(email);
            setAccessMode('user');
          }}
          onRegister={(_name, email) => {
            setUserEmail(email);
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
          {renderScreen(activeTab, setActiveTab, accessMode, userEmail, openAuth)}
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
) {
  switch (activeTab) {
    case 'explore':
      return <ExploreScreen />;
    case 'downloads':
      return <DownloadsScreen />;
    case 'trips':
      return (
        <TripsScreen
          isRegistered={accessMode === 'user'}
          ownerKey={userEmail}
          onLoginRequest={() => onOpenAuth('login')}
          onRegisterRequest={() => onOpenAuth('register')}
        />
      );
    case 'safety':
      return <SafetyScreen />;
    case 'home':
    default:
      return <HomeScreen onNavigate={onNavigate} />;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
