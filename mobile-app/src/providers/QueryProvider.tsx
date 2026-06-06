import React, { type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { attachOfflineQueue } from '../lib/offlineQueue';

// Query-Cache wird in AsyncStorage persistiert (für Buchungs-/Kundendaten ok,
// keine sensiblen Tokens — die liegen im SecureStore via adminClient).
// staleTime + refetchInterval ersetzen das alte 30s-Polling pro Screen.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s frisch — danach Background-Refetch
      gcTime: 1000 * 60 * 60 * 24, // 24h im Cache (für Offline-Restore)
      retry: (failureCount, error) => {
        // 401/403 nicht retryen — Auth-Problem
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      // Wichtig: Mutations bekommen einen mutationKey, damit sie persistiert
      // und nach Reload erneut ausgeführt werden können.
      networkMode: 'offlineFirst',
    },
  },
});

// Auto-Resume von Mutations bei Wiederverbindung
attachOfflineQueue(queryClient);

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'auszeit-query-cache',
  throttleTime: 1000,
});

// React-Query weiß auf Mobile nichts über AppState — wir verbinden's manuell.
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

// onlineManager hört auf NetInfo — TanStack Query pausiert Refetches automatisch
// wenn offline und resumed sie sobald wieder Verbindung da ist.
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

interface Props {
  children: ReactNode;
}

export function QueryProvider({ children }: Props) {
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24, // 24h
        buster: 'v1', // bei Cache-Schema-Änderung hochzählen
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
