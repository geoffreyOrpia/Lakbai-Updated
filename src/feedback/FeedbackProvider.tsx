import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing } from '../theme';

export type FeedbackTone = 'success' | 'error' | 'info';

type SnackbarOptions = {
  message: string;
  tone?: FeedbackTone;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
};

type FeedbackContextValue = {
  showToast: (message: string, tone?: FeedbackTone, duration?: number) => void;
  showSnackbar: (options: SnackbarOptions) => void;
  dismissSnackbar: () => void;
  showHud: (message?: string) => void;
  hideHud: () => void;
};

type ToastState = {
  message: string;
  tone: FeedbackTone;
};

type SnackbarState = SnackbarOptions & {
  tone: FeedbackTone;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const [hudMessage, setHudMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snackbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = (timer: typeof toastTimer) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const showToast = useCallback((message: string, tone: FeedbackTone = 'info', duration = 2200) => {
    clearTimer(toastTimer);
    setToast({ message, tone });
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  const dismissSnackbar = useCallback(() => {
    clearTimer(snackbarTimer);
    setSnackbar(null);
  }, []);

  const showSnackbar = useCallback((options: SnackbarOptions) => {
    clearTimer(snackbarTimer);
    setSnackbar({ ...options, tone: options.tone ?? 'info' });
    snackbarTimer.current = setTimeout(() => setSnackbar(null), options.duration ?? 3600);
  }, []);

  const showHud = useCallback((message = 'Please wait…') => {
    setHudMessage(message);
  }, []);

  const hideHud = useCallback(() => {
    setHudMessage(null);
  }, []);

  useEffect(() => () => {
    clearTimer(toastTimer);
    clearTimer(snackbarTimer);
  }, []);

  const value = useMemo<FeedbackContextValue>(() => ({
    showToast,
    showSnackbar,
    dismissSnackbar,
    showHud,
    hideHud,
  }), [dismissSnackbar, hideHud, showHud, showSnackbar, showToast]);

  return (
    <FeedbackContext.Provider value={value}>
      <View style={styles.root}>
        {children}

        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {toast ? (
            <View pointerEvents="none" style={styles.toastPosition}>
              <View style={[styles.toast, toneStyle(toast.tone)]}>
                <Ionicons name={toneIcon(toast.tone)} size={16} color={toneForeground(toast.tone)} />
                <Text style={[styles.toastText, { color: toneForeground(toast.tone) }]} numberOfLines={2}>
                  {toast.message}
                </Text>
              </View>
            </View>
          ) : null}

          {snackbar ? (
            <View pointerEvents="box-none" style={styles.snackbarPosition}>
              <View style={styles.snackbar}>
                <View style={[styles.snackbarIcon, { backgroundColor: toneBackground(snackbar.tone) }]}>
                  <Ionicons name={toneIcon(snackbar.tone)} size={18} color={toneForeground(snackbar.tone)} />
                </View>
                <Text style={styles.snackbarText}>{snackbar.message}</Text>
                {snackbar.actionLabel ? (
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      const action = snackbar.onAction;
                      dismissSnackbar();
                      action?.();
                    }}
                    style={({ pressed }) => [styles.snackbarAction, pressed && styles.pressed]}
                  >
                    <Text style={styles.snackbarActionText}>{snackbar.actionLabel}</Text>
                  </Pressable>
                ) : (
                  <Pressable hitSlop={8} onPress={dismissSnackbar} style={({ pressed }) => pressed && styles.pressed}>
                    <Ionicons name="close" size={18} color={colors.muted} />
                  </Pressable>
                )}
              </View>
            </View>
          ) : null}
        </View>

        <Modal
          transparent
          visible={Boolean(hudMessage)}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => undefined}
        >
          <View style={styles.hudBackdrop}>
            <View style={styles.hudCard}>
              <ActivityIndicator size="small" color={colors.forest} />
              <Text style={styles.hudText}>{hudMessage}</Text>
            </View>
          </View>
        </Modal>
      </View>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used inside FeedbackProvider.');
  }
  return context;
}

function toneIcon(tone: FeedbackTone): keyof typeof Ionicons.glyphMap {
  if (tone === 'success') return 'checkmark-circle';
  if (tone === 'error') return 'alert-circle';
  return 'information-circle';
}

function toneForeground(tone: FeedbackTone) {
  if (tone === 'success') return colors.forest;
  if (tone === 'error') return colors.danger;
  return colors.forestDark;
}

function toneBackground(tone: FeedbackTone) {
  if (tone === 'success') return colors.softGreen;
  if (tone === 'error') return '#F8E9E5';
  return colors.softOrange;
}

function toneStyle(tone: FeedbackTone) {
  return {
    backgroundColor: toneBackground(tone),
    borderColor: tone === 'error' ? '#E8C7BF' : tone === 'success' ? '#C7DDCC' : '#EDD7B5',
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toastPosition: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 54 : 18,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  toast: {
    maxWidth: 420,
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  toastText: {
    flexShrink: 1,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '800',
  },
  snackbarPosition: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 82,
    alignItems: 'center',
  },
  snackbar: {
    width: '100%',
    maxWidth: 560,
    minHeight: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  snackbarIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snackbarText: {
    flex: 1,
    color: colors.text,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '700',
  },
  snackbarAction: {
    minHeight: 36,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snackbarActionText: {
    color: colors.forest,
    fontSize: 10.5,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  hudBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 35, 29, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  hudCard: {
    minWidth: 150,
    maxWidth: 280,
    minHeight: 92,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  hudText: {
    color: colors.text,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
});
