// Offline-Queue für Mutations.
// TanStack Query pausiert Mutations automatisch wenn offline (via onlineManager),
// und persistiert sie via PersistQueryClient in AsyncStorage. Sobald NetInfo
// wieder isConnected meldet, ruft TanStack `resumePausedMutations()` auf.
//
// Diese Datei initialisiert das Auto-Resume + bietet eine kleine API zum
// Beobachten der Queue-Tiefe (für UI-Banner "X Änderungen offline").

import { onlineManager, type QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

let initialized = false;

/**
 * Verbindet TanStack Query mit dem NetInfo-State, sodass:
 * - Pending Mutations bei Wiederverbindung automatisch ausgeführt werden
 * - Failed Mutations einen Retry kriegen sobald online
 *
 * Muss EINMAL beim App-Start aufgerufen werden, NACH dem QueryClient-Init.
 */
export function attachOfflineQueue(queryClient: QueryClient): void {
  if (initialized) return;
  initialized = true;

  // Resume bei Wiederverbindung
  NetInfo.addEventListener((state) => {
    if (state.isConnected && onlineManager.isOnline()) {
      queryClient.resumePausedMutations();
    }
  });
}

/**
 * Anzahl Mutations, die wegen Offline-Status gerade in der Queue warten.
 * Nützlich für ein UI-Banner.
 */
export function pendingMutationsCount(queryClient: QueryClient): number {
  return queryClient
    .getMutationCache()
    .getAll()
    .filter((m) => m.state.isPaused || m.state.status === 'pending').length;
}
