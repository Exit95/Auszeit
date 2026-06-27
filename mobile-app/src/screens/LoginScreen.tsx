import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  TextInput, Alert, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, BrushAccent } from '../components';
import { useAuth } from '../hooks/useAuth';
import {
  useBiometrics,
  saveBiometricCredentials,
  loadBiometricCredentials,
} from '../hooks/useBiometrics';
import { adminApi } from '../api/adminClient';
import { getApiHost } from '../lib/utils';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';

// Wir validieren das Admin-Passwort live gegen den Server. Damit entfällt
// der hardcodierte 2468-PIN. Ein erfolgreicher Login schaltet sowohl
// Atelier- als auch Brenn-Endpoints frei (beide nutzen Basic-Auth).
const LIVE_AUTH_ENDPOINT = `${getApiHost()}/api/admin/bookings`;

type BioType = 'fingerprint' | 'face' | 'iris';

const BIO_LABEL: Record<BioType, string> = {
  fingerprint: 'Fingerabdruck',
  face: 'Face ID',
  iris: 'Iris-Scan',
};

const BIO_ICON: Record<BioType, keyof typeof Ionicons.glyphMap> = {
  fingerprint: 'finger-print',
  face: 'eye',
  iris: 'eye',
};

export function LoginScreen() {
  const { login } = useAuth();
  const { capability, optedIn, canUse, refreshOptIn } = useBiometrics();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Gemeinsamer Auth-Flow: Credentials gegen den Server validieren und Session öffnen.
  const performAuthenticatedLogin = useCallback(async (user: string, pass: string) => {
    await adminApi.setCredentials(user, pass);
    const response = await fetch(LIVE_AUTH_ENDPOINT, {
      headers: { Authorization: `Basic ${adminApi.getCredentials()}` },
    });
    if (!response.ok) {
      await adminApi.clearCredentials();
      if (response.status === 401) {
        throw new Error('Passwort ist falsch');
      }
      throw new Error(`Server antwortete mit ${response.status}`);
    }
    await login();
  }, [login]);

  const promptOptIn = useCallback((pass: string) => {
    const bioType: BioType = (capability?.type ?? 'fingerprint') as BioType;
    const label = BIO_LABEL[bioType];
    Alert.alert(
      'Schnell-Login einrichten?',
      `Möchtest du dich künftig per ${label} anmelden?`,
      [
        { text: 'Nein, danke', style: 'cancel' },
        {
          text: 'Ja, einrichten',
          onPress: async () => {
            try {
              await saveBiometricCredentials('admin', pass);
              await refreshOptIn();
            } catch (err) {
              if (__DEV__) console.warn('[Biometric] Opt-In fehlgeschlagen:', err);
            }
          },
        },
      ],
    );
  }, [capability, refreshOptIn]);

  const handleLogin = async () => {
    const trimmed = password.trim();
    if (!trimmed) {
      setError('Bitte Admin-Passwort eingeben');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await performAuthenticatedLogin('admin', trimmed);
      // Erfolgreich: ggf. Biometrie-Opt-In anbieten
      if (canUse && !optedIn) {
        promptOptIn(trimmed);
      }
    } catch (err: any) {
      setError(err?.message || 'Login fehlgeschlagen');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (bioLoading || loading) return;
    setError('');
    setBioLoading(true);
    try {
      const creds = await loadBiometricCredentials();
      if (!creds) {
        // User hat Bio-Prompt abgebrochen oder Auth schlug fehl — nichts tun
        return;
      }
      await performAuthenticatedLogin(creds.username, creds.password);
    } catch (err: any) {
      setError(err?.message || 'Biometrie-Login fehlgeschlagen');
    } finally {
      setBioLoading(false);
    }
  };

  const showBioButton = canUse && optedIn;
  const bioType: BioType = (capability?.type ?? 'fingerprint') as BioType;
  const bioLabel = BIO_LABEL[bioType];
  const bioIcon = BIO_ICON[bioType];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topAccent} />

        <View style={styles.header}>
          <Text style={styles.logoScript}>Malatelier</Text>
          <Text style={styles.logoBold}>Auszeit</Text>
          <BrushAccent width={74} />
          <Text style={styles.subtitle}>Brennverwaltung</Text>
        </View>

        <View style={styles.form}>
          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {showBioButton && (
            <>
              <Pressable
                onPress={handleBiometricLogin}
                disabled={bioLoading || loading}
                style={({ pressed }) => [
                  styles.bioButton,
                  pressed && styles.bioButtonPressed,
                  (bioLoading || loading) && styles.bioButtonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Mit ${bioLabel} anmelden`}
              >
                <Ionicons name={bioIcon} size={28} color={colors.primary} />
                <Text style={styles.bioButtonText}>
                  {bioLoading ? 'Authentifiziere…' : `Mit ${bioLabel} anmelden`}
                </Text>
              </Pressable>

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>oder</Text>
                <View style={styles.orLine} />
              </View>
            </>
          )}

          <Text style={styles.fieldLabel}>Admin-Passwort</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={password}
            onChangeText={(t) => { setPassword(t); if (error) setError(''); }}
            placeholder="Passwort"
            placeholderTextColor={colors.meta}
            secureTextEntry
            autoFocus={!showBioButton}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleLogin}
            returnKeyType="go"
          />

          <Text style={styles.hint}>
            Ein Login schaltet Atelier und Brennverwaltung gemeinsam frei.
          </Text>

          <Button
            title="Anmelden"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.loginButton}
          />
        </View>

        <Text style={styles.footer}>Feldstiege 6a · 48599 Gronau</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoScript: {
    fontSize: 20,
    fontWeight: fontWeight.normal,
    color: colors.meta,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  logoBold: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    letterSpacing: 1,
    marginTop: -2,
  },
  divider: {
    marginVertical: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.inkSecondary,
    letterSpacing: 1,
  },
  form: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
  },
  errorBox: {
    width: '100%',
    backgroundColor: colors.error + '12',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  bioButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  bioButtonPressed: {
    backgroundColor: colors.card,
    opacity: 0.88,
  },
  bioButtonDisabled: {
    opacity: 0.5,
  },
  bioButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    fontSize: fontSize.xs,
    color: colors.meta,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.inkSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.meta,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  loginButton: {
    width: '100%',
  },
  footer: {
    textAlign: 'center',
    color: colors.meta,
    fontSize: fontSize.xs,
    marginTop: spacing.xxl,
  },
});
