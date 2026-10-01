import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BackAction } from "../components/Buttons.jsx";
import { colors, layout, radius, shadows, spacing } from "../../../theme.jsx";

const MessageBubble = ({ message, onSuggestion, onAction }) => {
  const assistant = message.role === 'assistant';
  return <View style={[styles.messageRow, !assistant && styles.messageRowUser]}>
      <View style={[styles.bubble, assistant ? styles.assistantBubble : styles.userBubble]}>
        <Text style={[styles.messageText, !assistant && styles.userMessageText]}>{message.text}</Text>
        {(message.actions ?? []).length ? <View style={styles.actionList}>
            {message.actions.map((action, index) => <Pressable
              key={`${action.type}-${action.label}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => onAction(action)}
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            >
              <Text style={styles.actionButtonText}>{action.label}</Text>
              <Ionicons name="arrow-forward" size={15} color={colors.primary} />
            </Pressable>)}
          </View> : null}
        {(message.suggestions ?? []).length ? <View style={styles.suggestions}>
            {message.suggestions.slice(0, 2).map(suggestion => <Pressable
              key={suggestion}
              accessibilityRole="button"
              accessibilityLabel={suggestion}
              onPress={() => onSuggestion(suggestion)}
              style={({ pressed }) => [styles.suggestionChip, pressed && styles.pressed]}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>)}
          </View> : null}
      </View>
    </View>;
};

export const AssistantScreen = ({ viewModel }) => {
  const state = viewModel.state;
  const listRef = useRef(null);

  useEffect(() => {
    if (!state.messages.length) return;
    requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: true }));
  }, [state.messages.length]);

  if (state.loading && !state.messages.length) {
    return <View style={styles.loadingScreen}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingTitle}>Opening Ask LakBai</Text>
        <Text style={styles.loadingText}>Loading local destination information.</Text>
      </View>;
  }

  return <KeyboardAvoidingView
    style={styles.screen}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
      <View style={styles.header}>
        <BackAction label="LakBai" onPress={() => viewModel.back()} />
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
          </View>
          <View style={styles.titleCopy}>
            <Text style={styles.eyebrow}>LOCAL TRAVEL ASSISTANT</Text>
            <Text style={styles.title}>Ask LakBai</Text>
          </View>
        </View>
      </View>

      {state.error ? <View style={styles.errorCard}>
          <Text style={styles.errorText}>{state.error}</Text>
        </View> : null}

      <FlatList
        ref={listRef}
        data={state.messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <MessageBubble
          message={item}
          onSuggestion={suggestion => void viewModel.submit(suggestion)}
          onAction={action => viewModel.runAction(action)}
        />}
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.composer, shadows.floating]}>
        <TextInput
          value={state.input}
          onChangeText={value => viewModel.setInput(value)}
          onSubmitEditing={() => void viewModel.submit()}
          placeholder="Ask about places, trips, directions…"
          placeholderTextColor={colors.faint}
          multiline
          maxLength={280}
          editable={!state.busy && Boolean(state.knowledge)}
          style={styles.input}
          accessibilityLabel="Ask LakBai message"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: state.busy || !state.input.trim() }}
          disabled={state.busy || !state.input.trim()}
          onPress={() => void viewModel.submit()}
          style={({ pressed }) => [
            styles.sendButton,
            (state.busy || !state.input.trim()) && styles.sendDisabled,
            pressed && !state.busy && styles.pressed,
          ]}
        >
          {state.busy
            ? <ActivityIndicator size="small" color={colors.onPrimary} />
            : <Ionicons name="arrow-up" size={19} color={colors.onPrimary} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>;
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  messages: {
    paddingHorizontal: layout.screenGutter,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  messageRow: {
    alignItems: 'flex-start',
  },
  messageRowUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '91%',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  assistantBubble: {
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: '#CBE6D5',
  },
  userBubble: {
    backgroundColor: colors.text,
  },
  messageText: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 19,
  },
  userMessageText: {
    color: colors.white,
  },
  actionList: {
    gap: 7,
  },
  actionButton: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionButtonText: {
    flex: 1,
    color: colors.text,
    fontSize: 11.5,
    fontWeight: '800',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  suggestionChip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  suggestionText: {
    color: colors.primaryDark,
    fontSize: 10.5,
    fontWeight: '700',
  },
  composer: {
    marginHorizontal: layout.screenGutter,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: 7,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    color: colors.text,
    fontSize: 12.5,
    lineHeight: 18,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  loadingTitle: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
  },
  errorCard: {
    marginHorizontal: layout.screenGutter,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
});
