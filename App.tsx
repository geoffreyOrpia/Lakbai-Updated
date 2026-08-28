import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

import { BottomNav } from './src/components/BottomNav';
import { DownloadsScreen } from './src/screens/DownloadsScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SafetyScreen } from './src/screens/SafetyScreen';
import { colors } from './src/theme';
import type { TabKey } from './src/types/navigation';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={colors.offWhite} />
      <View style={styles.screen}>
        <View style={styles.content}>{renderScreen(activeTab, setActiveTab)}</View>
        <BottomNav active={activeTab} onChange={setActiveTab} />
      </View>
    </SafeAreaView>
  );
}

function renderScreen(activeTab: TabKey, onNavigate: (tab: TabKey) => void) {
  switch (activeTab) {
    case 'explore':
      return <ExploreScreen />;
    case 'downloads':
      return <DownloadsScreen />;
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
