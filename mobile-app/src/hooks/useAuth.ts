import { createContext, useContext, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminApi } from '../api/adminClient';
import { api } from '../api/client';

const store = {
  get: (key: string) => Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),
  set: (key: string, val: string) => Platform.OS === 'web' ? AsyncStorage.setItem(key, val) : SecureStore.setItemAsync(key, val),
  del: (key: string) => Platform.OS === 'web' ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};

// Auth-Modell:
// Login läuft ausschließlich über LiveValidation gegen /api/admin/bookings
// (Basic-Auth). Der AuthContext hält nur einen Bool-Flag + User-Objekt.
// Es gibt KEINEN lokalen PIN mehr — die einzige Wahrheitsquelle ist das
// Server-validierte Admin-Passwort (gespeichert in SecureStore via adminApi).
const AUTH_KEY = 'brenn_authenticated';
const LEGACY_AUTH_KEY = 'brenn_authenticated';

interface AuthContextType {
  user: { name: string } | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  isAuthenticated: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthProvider() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const init = useCallback(async () => {
    // Web: Design-Preview ohne Login
    if (Platform.OS === 'web') {
      setUser({ name: 'Irena' });
      setLoading(false);
      return;
    }
    try {
      await Promise.all([
        adminApi.init().catch(() => {}),
        api.init().catch(() => {}),
      ]);

      let stored = await store.get(AUTH_KEY);

      // One-time Migration aus AsyncStorage (falls alter Auth-State existiert)
      if (!stored) {
        try {
          const legacy = await AsyncStorage.getItem(LEGACY_AUTH_KEY);
          if (legacy === 'true') {
            await store.set(AUTH_KEY, 'true');
            await AsyncStorage.removeItem(LEGACY_AUTH_KEY);
            stored = 'true';
          }
        } catch {
          // Migration optional
        }
      }

      if (stored === 'true' && adminApi.getCredentials()) {
        setUser({ name: 'Irena' });
      } else if (stored === 'true' && !adminApi.getCredentials()) {
        // Legacy-Session ohne Admin-Credentials: Nutzer muss neu einloggen
        await store.del(AUTH_KEY);
      }
    } catch {
      // Ignore — User sieht Login-Screen
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async () => {
    // LoginScreen validiert vorher gegen Server; wir markieren hier nur die Session
    await store.set(AUTH_KEY, 'true');
    setUser({ name: 'Irena' });
  }, []);

  const logout = useCallback(async () => {
    await store.del(AUTH_KEY);
    await adminApi.clearCredentials().catch(() => {});
    await api.clearToken().catch(() => {});
    setUser(null);
  }, []);

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    init,
  };
}
