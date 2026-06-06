import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  TextInput,
} from 'react-native';
import { Button } from '../components';
import { useAuth } from '../hooks/useAuth';
import { adminApi } from '../api/adminClient';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';

// Wir validieren das Admin-Passwort live gegen den Server. Damit entfällt
// der hardcodierte 2468-PIN. Ein erfolgreicher Login schaltet sowohl
// Atelier- als auch Brenn-Endpoints frei (beide nutzen Basic-Auth).
const API_HOST =
  (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_API_HOST) ||
  'https://keramik-auszeit.de';
const LIVE_AUTH_ENDPOINT = `${API_HOST}/api/admin/bookings`;

export function LoginScreen() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    const trimmed = password.trim();
    if (!trimmed) {
      setError('Bitte Admin-Passwort eingeben');
      return;
    }

    setError('');
    setLoading(true);
    try {
      // Basic-Auth gegen die echte Admin-API validieren
      await adminApi.setCredentials('admin', trimmed);
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
      // Server-Validation erfolgreich → Session markieren
      await login();
    } catch (err: any) {
      setError(err?.message || 'Login fehlgeschlagen');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

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
          <View style={styles.divider} />
          <Text style={styles.subtitle}>Brennverwaltung</Text>
        </View>

        <View style={styles.form}>
          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.fieldLabel}>Admin-Passwort</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={password}
            onChangeText={(t) => { setPassword(t); if (error) setError(''); }}
            placeholder="Passwort"
            placeholderTextColor={colors.textLight}
            secureTextEntry
            autoFocus
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
    height: 4,
    backgroundColor: colors.accent,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoScript: {
    fontSize: 20,
    fontWeight: fontWeight.normal,
    color: colors.primary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  logoBold: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.brandEspresso,
    letterSpacing: 1,
    marginTop: -2,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: colors.accent,
    marginVertical: spacing.md,
    borderRadius: 1,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
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
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
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
    color: colors.text,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  loginButton: {
    width: '100%',
  },
  footer: {
    textAlign: 'center',
    color: colors.textLight,
    fontSize: fontSize.xs,
    marginTop: spacing.xxl,
  },
});
