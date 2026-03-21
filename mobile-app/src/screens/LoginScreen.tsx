import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Input, Button } from '../components';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, fontSize, fontWeight } from '../theme';
import { ApiError } from '../api/client';

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Bitte E-Mail und Passwort eingeben');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Verbindung zum Server fehlgeschlagen');
      }
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
        <View style={styles.header}>
          <Text style={styles.logo}>Auszeit</Text>
          <Text style={styles.subtitle}>Brennsystem</Text>
        </View>

        <View style={styles.form}>
          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            label="E-Mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="name@keramik-auszeit.de"
          />

          <Input
            label="Passwort"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Passwort eingeben"
            onSubmitEditing={handleLogin}
          />

          <Button
            title="Anmelden"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.loginButton}
          />
        </View>
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  errorBox: {
    backgroundColor: colors.error + '12',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  loginButton: {
    marginTop: spacing.md,
  },
});
