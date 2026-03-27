import { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Einfacher PIN-Schutz — Irena kennt den PIN
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
      const stored = await AsyncStorage.getItem(AUTH_KEY);
      if (stored === 'true') {
        setUser({ name: 'Irena' });
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
