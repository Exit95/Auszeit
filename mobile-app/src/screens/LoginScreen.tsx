import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  TextInput, Pressable,
} from 'react-native';
import { Button } from '../components';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';

const PIN_LENGTH = 6;

export function LoginScreen() {
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!pin.trim()) {
      setError('Bitte PIN eingeben');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(pin.trim());
    } catch (err: any) {
      setError(err.message || 'Falscher PIN');
      setPin('');
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

          {/* PIN Dot Display */}
          <View style={styles.pinDotsRow}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  i < pin.length && styles.pinDotFilled,
                ]}
              />
            ))}
          </View>

          {/* Hidden text input captures keyboard input */}
          <TextInput
            style={styles.hiddenInput}
            value={pin}
            onChangeText={text => {
              setPin(text.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH));
              if (error) setError('');
            }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={PIN_LENGTH}
            onSubmitEditing={handleLogin}
            autoFocus
          />

          <Text style={styles.pinHint}>PIN antippen um Tastatur zu öffnen</Text>

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
    maxWidth: 300,
    alignSelf: 'center',
    alignItems: 'center',
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
  pinDotsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  pinHint: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  loginButton: {
    width: '100%',
    marginTop: spacing.xs,
  },
  footer: {
    textAlign: 'center',
    color: colors.textLight,
    fontSize: fontSize.xs,
    marginTop: spacing.xxl,
  },
});
