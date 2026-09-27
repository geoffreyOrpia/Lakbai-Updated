import * as Speech from 'expo-speech';

export const createSpeechService = () => ({
  speak: async text => {
    if (!text) return false;
    try {
      await Speech.stop();
      Speech.speak(text, {
        language: 'en-PH',
        rate: 0.95,
      });
      return true;
    } catch {
      return false;
    }
  },
  stop: async () => {
    try {
      await Speech.stop();
    } catch {
      // Speech is optional guidance; navigation must keep working if TTS fails.
    }
  },
});
