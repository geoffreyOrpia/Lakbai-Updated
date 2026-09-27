import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing } from "../theme.jsx";
const FeedbackContext = createContext(null);
export const FeedbackProvider = ({
  children
}) => {
  const [toast, setToast] = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [hudMessage, setHudMessage] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const toastTimer = useRef(null);
  const snackbarTimer = useRef(null);
  const clearTimer = timer => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const showToast = useCallback((message, tone = 'info', duration = 2200) => {
    clearTimer(toastTimer);
    setToast({
      message,
      tone
    });
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);
  const dismissSnackbar = useCallback(() => {
    clearTimer(snackbarTimer);
    setSnackbar(null);
  }, []);
  const showSnackbar = useCallback(options => {
    clearTimer(snackbarTimer);
    setSnackbar({
      ...options,
      tone: options.tone ?? 'info'
    });
    snackbarTimer.current = setTimeout(() => setSnackbar(null), options.duration ?? 3600);
  }, []);
  const showHud = useCallback((message = 'Please wait…') => {
    setHudMessage(message);
  }, []);
  const hideHud = useCallback(() => {
    setHudMessage(null);
  }, []);
  const dismissConfirm = useCallback(() => {
    setConfirmation(null);
  }, []);
  const showConfirm = useCallback(options => {
    setConfirmation({
      title: options.title ?? 'Confirm action',
      message: options.message ?? '',
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      tone: options.tone ?? 'danger',
      onConfirm: options.onConfirm
    });
  }, []);
  useEffect(() => () => {
    clearTimer(toastTimer);
    clearTimer(snackbarTimer);
  }, []);
  const value = useMemo(() => ({
    showToast,
    showSnackbar,
    dismissSnackbar,
    showHud,
    hideHud,
    showConfirm,
    dismissConfirm
  }), [dismissConfirm, dismissSnackbar, hideHud, showConfirm, showHud, showSnackbar, showToast]);
  return <FeedbackContext.Provider value={value}>
      <View style={styles.root}>
        {children}

        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {toast ? <View pointerEvents="none" style={styles.toastPosition}>
              <View style={[styles.toast, toneStyle(toast.tone)]}>
                <Ionicons name={toneIcon(toast.tone)} size={16} color={toneForeground(toast.tone)} />
                <Text style={[styles.toastText, {
              color: toneForeground(toast.tone)
            }]} numberOfLines={2}>
                  {toast.message}
                </Text>
              </View>
            </View> : null}

          {snackbar ? <View pointerEvents="box-none" style={styles.snackbarPosition}>
              <View style={[styles.snackbar, shadows.floating]}>
                <View style={[styles.snackbarIcon, {
              backgroundColor: toneBackground(snackbar.tone)
            }]}>
                  <Ionicons name={toneIcon(snackbar.tone)} size={18} color={toneForeground(snackbar.tone)} />
                </View>
                <Text style={styles.snackbarText}>{snackbar.message}</Text>
                {snackbar.actionLabel ? <Pressable hitSlop={8} onPress={() => {
              const action = snackbar.onAction;
              dismissSnackbar();
              action?.();
            }} style={({
              pressed
            }) => [styles.snackbarAction, pressed && styles.pressed]}>
                    <Text style={[styles.snackbarActionText, snackbar.tone === 'error' && styles.snackbarActionTextDanger]}>
                      {snackbar.actionLabel}
                    </Text>
                  </Pressable> : <Pressable hitSlop={8} onPress={dismissSnackbar} style={({
              pressed
            }) => pressed && styles.pressed}>
                    <Ionicons name="close" size={18} color={colors.muted} />
                  </Pressable>}
              </View>
            </View> : null}
        </View>

        <Modal transparent visible={Boolean(confirmation)} animationType="fade" statusBarTranslucent onRequestClose={dismissConfirm}>
          <View style={styles.confirmBackdrop}>
            <View style={[styles.confirmCard, shadows.floating]} accessibilityRole="alert">
              <View style={styles.confirmIcon}>
                <Ionicons name={confirmation?.tone === 'danger' ? 'warning-outline' : 'help-circle-outline'} size={22} color={confirmation?.tone === 'danger' ? colors.danger : colors.primary} />
              </View>
              <Text style={styles.confirmTitle}>{confirmation?.title}</Text>
              <Text style={styles.confirmMessage}>{confirmation?.message}</Text>
              <View style={styles.confirmActions}>
                <Pressable accessibilityRole="button" onPress={dismissConfirm} style={({ pressed }) => [styles.confirmCancel, pressed && styles.pressed]}>
                  <Text style={styles.confirmCancelText}>{confirmation?.cancelLabel}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => {
                  const action = confirmation?.onConfirm;
                  dismissConfirm();
                  action?.();
                }} style={({ pressed }) => [styles.confirmAction, confirmation?.tone === 'danger' && styles.confirmActionDanger, pressed && styles.pressed]}>
                  <Text style={styles.confirmActionText}>{confirmation?.confirmLabel}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal transparent visible={Boolean(hudMessage)} animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
          <View style={styles.hudBackdrop}>
            <View style={[styles.hudCard, shadows.floating]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.hudText}>{hudMessage}</Text>
            </View>
          </View>
        </Modal>
      </View>
    </FeedbackContext.Provider>;
};
export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used inside FeedbackProvider.');
  }
  return context;
};
const toneIcon = tone => {
  if (tone === 'success') return 'checkmark-circle';
  if (tone === 'error') return 'alert-circle';
  return 'information-circle';
};
const toneForeground = tone => {
  if (tone === 'success') return colors.primary;
  if (tone === 'error') return colors.danger;
  return colors.textSecondary;
};
const toneBackground = tone => {
  if (tone === 'success') return colors.primarySoft;
  if (tone === 'error') return colors.dangerSoft;
  return colors.accentSoft;
};
const toneStyle = tone => {
  return {
    backgroundColor: toneBackground(tone),
    borderColor: tone === 'error' ? '#F2CFCF' : tone === 'success' ? '#CBE6D5' : '#F3D9C4'
  };
};
const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  toastPosition: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 86 : 52,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center'
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
    ...shadows.card
  },
  toastText: {
    flexShrink: 1,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '800'
  },
  snackbarPosition: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 104,
    alignItems: 'center'
  },
  snackbar: {
    width: '100%',
    maxWidth: 560,
    minHeight: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  snackbarIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  snackbarText: {
    flex: 1,
    color: colors.text,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '700'
  },
  snackbarAction: {
    minHeight: 36,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center'
  },
  snackbarActionText: {
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  snackbarActionTextDanger: {
    color: colors.danger
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm
  },
  confirmIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'center'
  },
  confirmMessage: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center'
  },
  confirmActions: {
    width: '100%',
    marginTop: spacing.xs,
    flexDirection: 'row',
    gap: spacing.sm
  },
  confirmCancel: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmCancelText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800'
  },
  confirmAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmActionDanger: {
    backgroundColor: colors.danger
  },
  confirmActionText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900'
  },
  hudBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl
  },
  hudCard: {
    minWidth: 150,
    maxWidth: 280,
    minHeight: 92,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm
  },
  hudText: {
    color: colors.text,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center'
  },
  pressed: {
    opacity: 0.65
  }
});
