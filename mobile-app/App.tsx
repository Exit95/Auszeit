import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthContext, useAuthProvider } from './src/hooks/useAuth';
import { LoadingScreen } from './src/components/LoadingScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { QueryProvider } from './src/providers/QueryProvider';
import { usePushNotifications } from './src/hooks/usePushNotifications';

// OTA-Updates beim App-Start explizit prüfen und sofort anwenden.
// Ohne diesen Aufruf würde die App zwar im Hintergrund nach Updates suchen,
// aber erst beim NÄCHSTEN Start neu laden → User erlebt "nichts hat sich geändert".
async function applyUpdatesIfAny() {
  if (__DEV__ || Platform.OS === 'web') return;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (check.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (err) {
    // Non-fatal — App startet trotzdem mit dem eingebetteten Bundle
    if (__DEV__) console.warn('[OTA] Update-Check fehlgeschlagen:', err);
  }
}

export default function App() {
  const auth = useAuthProvider();
  usePushNotifications();

  useEffect(() => {
    applyUpdatesIfAny();
    auth.init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (auth.loading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthContext.Provider
            value={{
              user: auth.user,
              loading: auth.loading,
              login: auth.login,
              logout: auth.logout,
              isAuthenticated: auth.isAuthenticated,
            }}
          >
            <NavigationContainer>
              <AppNavigator />
              <StatusBar style="light" backgroundColor="#A0522D" />
            </NavigationContainer>
          </AuthContext.Provider>
        </QueryProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
