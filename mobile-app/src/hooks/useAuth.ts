import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client';
import type { User, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const init = useCallback(async () => {
    try {
      await api.init();
      if (api.getToken()) {
        const data = await api.get<{ user: User }>('/auth/me');
        setUser(data.user);
      }
    } catch {
      await api.clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>('/auth/login', { email, password });
    await api.setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.clearToken();
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
