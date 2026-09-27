import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { FeedbackProvider } from "./src/feedback/FeedbackProvider.jsx";
import { AppNavigator } from "./src/presentation/navigation/AppNavigator.jsx";
import { colors } from "./src/theme.jsx";
const App = () => {
  return <SafeAreaProvider>
      <FeedbackProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="dark" />
          <AppNavigator />
        </SafeAreaView>
      </FeedbackProvider>
    </SafeAreaProvider>;
};
export default App;
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white
  }
});
