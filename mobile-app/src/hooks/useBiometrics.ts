import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// Speichert den Admin-Pwd-Hash im SecureStore mit Biometric-Lock,
// sodass Re-Login per Fingerabdruck/Face geht.
const BIOMETRIC_KEY = 'biometric_credentials';
const BIOMETRIC_OPT_IN = 'biometric_opt_in';

interface BiometricCapability {
  available: boolean;
  enrolled: boolean;
  type: 'fingerprint' | 'face' | 'iris' | null;
  reason: string | null;
}

export async function checkBiometricCapability(): Promise<BiometricCapability> {
  if (Platform.OS === 'web') return { available: false, enrolled: false, type: null, reason: 'Web' };
  const hardware = await LocalAuthentication.hasHardwareAsync();
  if (!hardware) {
    return { available: false, enrolled: false, type: null, reason: 'Kein biometrischer Sensor' };
  }
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) {
    return {
      available: true,
      enrolled: false,
      type: null,
      reason: 'Keine biometrischen Daten hinterlegt (Einstellungen → Sicherheit)',
    };
  }
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  let type: BiometricCapability['type'] = null;
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) type = 'face';
  else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) type = 'fingerprint';
  else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) type = 'iris';
  return { available: true, enrolled: true, type, reason: null };
}

export async function saveBiometricCredentials(username: string, password: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(
    BIOMETRIC_KEY,
    JSON.stringify({ username, password }),
    { requireAuthentication: true, authenticationPrompt: 'Login mit Fingerabdruck' }
  );
  await SecureStore.setItemAsync(BIOMETRIC_OPT_IN, 'true');
}

export async function loadBiometricCredentials(): Promise<{ username: string; password: string } | null> {
  if (Platform.OS === 'web') return null;
  try {
    const raw = await SecureStore.getItemAsync(BIOMETRIC_KEY, {
      requireAuthentication: true,
      authenticationPrompt: 'Anmelden mit Fingerabdruck',
    });
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    // User hat Prompt abgebrochen oder Auth fehlgeschlagen
    return null;
  }
}

export async function clearBiometricCredentials(): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_OPT_IN);
}

export async function isBiometricOptedIn(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const flag = await SecureStore.getItemAsync(BIOMETRIC_OPT_IN);
  return flag === 'true';
}

/**
 * Hook für UI-Komponenten: liefert Status + Aktionen.
 * Lädt Capability beim Mount, prüft Opt-In.
 */
export function useBiometrics() {
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([checkBiometricCapability(), isBiometricOptedIn()]).then(([cap, opt]) => {
      if (cancelled) return;
      setCapability(cap);
      setOptedIn(opt);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshOptIn = useCallback(async () => {
    setOptedIn(await isBiometricOptedIn());
  }, []);

  return {
    capability,
    optedIn,
    canUse: !!capability?.available && !!capability?.enrolled,
    refreshOptIn,
  };
}
