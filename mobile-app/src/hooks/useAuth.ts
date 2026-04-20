import { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminApi } from '../api/adminClient';
import { api } from '../api/client';

// Legacy-PIN nur als Fallback — echter Schutz ist das Admin-Passwort
// (validiert live im LoginScreen gegen die Server-API).
const APP_PIN = '2468';
const AUTH_KEY = 'brenn_authenticated';

interface AuthContextType {
  user: { name: string } | null;
  loading: boolean;
  login: (pin: string) => Promise<void>;
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
    try {
      // API-Credentials zuerst laden, damit kein Render ohne Auth passiert
      await Promise.all([
        adminApi.init().catch(() => {}),
        api.init().catch(() => {}),
      ]);
      const stored = await AsyncStorage.getItem(AUTH_KEY);
      if (stored === 'true' && adminApi.getCredentials()) {
        setUser({ name: 'Irena' });
      } else if (stored === 'true' && !adminApi.getCredentials()) {
        // Legacy-Session ohne Admin-Credentials: Nutzer muss neu einloggen
        await AsyncStorage.removeItem(AUTH_KEY);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (pin: string) => {
    if (pin !== APP_PIN) {
      throw new Error('Falscher PIN');
    }
    await AsyncStorage.setItem(AUTH_KEY, 'true');
    setUser({ name: 'Irena' });
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
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
