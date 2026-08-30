import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, layout, radius, spacing } from '../theme';

export type AuthView = 'welcome' | 'login' | 'register';

type Props = {
  view: AuthView;
  onViewChange: (view: AuthView) => void;
  onContinueAsGuest: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
};

export function AuthScreen({
  view,
  onViewChange,
  onContinueAsGuest,
  onLogin,
  onRegister,
}: Props) {
  if (view === 'login') {
    return (
      <AuthForm
        mode="login"
        onBack={() => onViewChange('welcome')}
        onAlternate={() => onViewChange('register')}
        onContinueAsGuest={onContinueAsGuest}
        onSubmitLogin={onLogin}
      />
    );
  }

  if (view === 'register') {
    return (
      <AuthForm
        mode="register"
        onBack={() => onViewChange('welcome')}
        onAlternate={() => onViewChange('login')}
        onContinueAsGuest={onContinueAsGuest}
        onSubmitRegister={onRegister}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.welcomeContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.brandBlock}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.eyebrow}>OFFLINE-FIRST DAVAO DEL NORTE</Text>
        <Text style={styles.welcomeTitle}>Explore beyond the signal.</Text>
        <Text style={styles.welcomeText}>
          Download local destination packs before your trip, then keep trails, travel notes, and essential information available offline.
        </Text>
      </View>

      <View style={styles.featureRow}>
        <Feature icon="download-outline" label="Offline packs" />
        <Feature icon="map-outline" label="Saved trails" />
        <Feature icon="navigate-outline" label="GPS-ready" />
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Login" onPress={() => onViewChange('login')} />
        <SecondaryButton label="Create account" onPress={() => onViewChange('register')} />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.divider} />
        </View>

        <Pressable
          onPress={onContinueAsGuest}
          style={({ pressed }) => [styles.guestButton, pressed && styles.pressed]}
        >
          <Ionicons name="person-outline" size={18} color={colors.forest} />
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
          <Ionicons name="arrow-forward" size={17} color={colors.forest} />
        </Pressable>
        <Text style={styles.guestNote}>
          Guest access includes destination browsing, offline packs, trails, GPS, and safety information.
        </Text>
      </View>
    </ScrollView>
  );
}

type FormProps = {
  mode: 'login' | 'register';
  onBack: () => void;
  onAlternate: () => void;
  onContinueAsGuest: () => void;
  onSubmitLogin?: (email: string, password: string) => Promise<void>;
  onSubmitRegister?: (name: string, email: string, password: string) => Promise<void>;
};

function AuthForm({
  mode,
  onBack,
  onAlternate,
  onContinueAsGuest,
  onSubmitLogin,
  onSubmitRegister,
}: FormProps) {
  const isRegister = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (isRegister && cleanName.length < 2) {
      setError('Enter your full name.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      if (isRegister) {
        await onSubmitRegister?.(cleanName, cleanEmail, password);
      } else {
        await onSubmitLogin?.(cleanEmail, password);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.formKeyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={20} color={colors.forest} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.formHeader}>
          <Image source={require('../../assets/logo.png')} style={styles.formLogo} resizeMode="contain" />
          <View style={styles.formHeaderCopy}>
            <Text style={styles.formEyebrow}>LAKBAYLOKAL</Text>
            <Text style={styles.formTitle}>{isRegister ? 'Create your account' : 'Welcome back'}</Text>
            <Text style={styles.formSubtitle}>
              {isRegister
                ? 'Create an account for account-ready features while keeping the core travel experience offline-first.'
                : 'Sign in to continue. Your downloaded destination content remains designed for offline use.'}
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          {isRegister ? (
            <Field
              label="Full name"
              value={name}
              onChangeText={setName}
              placeholder="Juan Dela Cruz"
              icon="person-outline"
              textContentType="name"
              autoCapitalize="words"
            />
          ) : null}

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            icon="mail-outline"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoCapitalize="none"
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={[styles.inputWrap, error && password.length < 6 ? styles.inputError : null]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPassword}
                style={styles.input}
                textContentType={isRegister ? 'newPassword' : 'password'}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setShowPassword((current) => !current)}
                hitSlop={8}
                style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={colors.forest}
                />
              </Pressable>
            </View>
          </View>

          {isRegister ? (
            <Field
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat your password"
              icon="shield-checkmark-outline"
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              autoCapitalize="none"
            />
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <PrimaryButton
            label={submitting ? (isRegister ? 'Creating account…' : 'Signing in…') : isRegister ? 'Create account' : 'Sign in'}
            onPress={() => void submit()}
            disabled={submitting}
          />

          <Text style={styles.prototypeNote}>
            Accounts are stored locally on this device for the offline-first prototype. Registration, login verification, and session restoration now persist between app restarts.
          </Text>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>{isRegister ? 'Already have an account?' : 'New to LakbayLokal?'}</Text>
          <Pressable onPress={onAlternate} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.switchAction}>{isRegister ? 'Login' : 'Create account'}</Text>
          </Pressable>
        </View>

        <Pressable onPress={onContinueAsGuest} style={({ pressed }) => [styles.guestLink, pressed && styles.pressed]}>
          <Ionicons name="person-outline" size={17} color={colors.forest} />
          <Text style={styles.guestLinkText}>Continue as Guest instead</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: 'person-outline' | 'mail-outline' | 'shield-checkmark-outline';
  keyboardType?: 'email-address';
  textContentType?: 'name' | 'emailAddress' | 'newPassword';
  autoCapitalize?: 'none' | 'words';
  secureTextEntry?: boolean;
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType,
  textContentType,
  autoCapitalize,
  secureTextEntry,
}: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={18} color={colors.muted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          textContentType={textContentType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          style={styles.input}
        />
      </View>
    </View>
  );
}

type FeatureProps = {
  icon: 'download-outline' | 'map-outline' | 'navigate-outline';
  label: string;
};

function Feature({ icon, label }: FeatureProps) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={18} color={colors.forest} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
      <Ionicons name="arrow-forward" size={18} color={colors.white} />
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}

const styles = StyleSheet.create({
  welcomeContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  brandBlock: {
    alignItems: 'center',
  },
  logo: {
    width: 132,
    height: 132,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    color: colors.orange,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  welcomeTitle: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 29,
    lineHeight: 33,
    fontWeight: '900',
    letterSpacing: -0.9,
    textAlign: 'center',
  },
  welcomeText: {
    maxWidth: 520,
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 13.2,
    lineHeight: 19,
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  feature: {
    flex: 1,
    minHeight: 78,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    color: colors.text,
    fontSize: 10.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: spacing.sm,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.forest,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 13.5,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.forest,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    color: colors.forest,
    fontSize: 13.5,
    fontWeight: '900',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xxs,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.muted,
    fontSize: 9.5,
    fontWeight: '800',
  },
  guestButton: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.softGreen,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  guestButtonText: {
    color: colors.forest,
    fontSize: 13.2,
    fontWeight: '900',
  },
  guestNote: {
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: 'center',
  },
  formKeyboard: {
    flex: 1,
  },
  formContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  backButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  backText: {
    color: colors.forest,
    fontSize: 12.5,
    fontWeight: '800',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  formLogo: {
    width: 76,
    height: 76,
  },
  formHeaderCopy: {
    flex: 1,
  },
  formEyebrow: {
    color: colors.orange,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  formTitle: {
    marginTop: 2,
    color: colors.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  formSubtitle: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12.5,
    lineHeight: 18,
  },
  formCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 11.5,
    fontWeight: '800',
  },
  inputWrap: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 0,
    color: colors.text,
    fontSize: 13.5,
  },
  eyeButton: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.softOrange,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 11.2,
    lineHeight: 15,
    fontWeight: '700',
  },
  prototypeNote: {
    color: colors.muted,
    fontSize: 10.2,
    lineHeight: 15,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  switchText: {
    color: colors.muted,
    fontSize: 12,
  },
  switchAction: {
    color: colors.forest,
    fontSize: 12,
    fontWeight: '900',
  },
  guestLink: {
    minHeight: 44,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  guestLinkText: {
    color: colors.forest,
    fontSize: 12,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.72,
  },
});
