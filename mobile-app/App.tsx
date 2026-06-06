import React, { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthContext, useAuthProvider } from './src/hooks/useAuth';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { NetworkBanner } from './src/components/NetworkBanner';
import { QueryProvider } from './src/providers/QueryProvider';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { initSentry, Sentry } from './src/lib/sentry';
import { colors } from './src/theme';
import type { RootStackParamList } from './src/types';

// Sentry sofort initialisieren — vor Render, damit auch Init-Fehler erfasst werden
initSentry();

// Splash bleibt sichtbar bis auth.init() durch ist (kein Flash zur LoadingScreen)
SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash-API kann beim Hot-Reload schon "verbraucht" sein — ignorieren
});

// React Navigation Linking-Config für Push-Notification-Deep-Links.
// Server schickt Notification-Payload mit `data.url`, z. B. "auszeit://booking/abc-123"
// → öffnet BookingDetail-Screen mit id=abc-123.
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['auszeit://', 'https://keramik-auszeit.de'],
  config: {
    screens: {
      Login: 'login',
      Main: 'app',
      OrderDetail: 'order/:id',
      OrderForm: 'order/new',
      CustomerDetail: 'customer/:id',
      CustomerForm: 'customer/new',
      AtelierToday: 'atelier/today',
      AtelierBookings: 'atelier/bookings',
      AtelierInquiries: 'atelier/inquiries',
      AtelierSlots: 'atelier/slots',
      BookingCreate: 'atelier/booking/new',
      BlockedDates: 'atelier/blocked-dates',
      Stats: 'atelier/stats',
      InquiryDetail: 'inquiry/:id',
      BookingDetail: 'booking/:id',
      AdminReviews: 'reviews',
      VoucherScanner: 'voucher-scanner',
      Vouchers: 'vouchers',
    },
  },
  // Push-URL aus Notification-Payload als Initial-URL nutzen, wenn App via Push gestartet
  async getInitialURL() {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response?.notification.request.content.data?.url as string | undefined;
  },
  subscribe(listener) {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url as string | undefined;
      if (url) listener(url);
    });
    return () => sub.remove();
  },
};

async function applyUpdatesIfAny() {
  if (__DEV__ || Platform.OS === 'web') return;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (check.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (err) {
    if (__DEV__) console.warn('[OTA] Update-Check fehlgeschlagen:', err);
  }
}

function App() {
  const auth = useAuthProvider();
  const [splashHidden, setSplashHidden] = useState(false);

  usePushNotifications({ enabled: auth.isAuthenticated });

  useEffect(() => {
    applyUpdatesIfAny();
    auth.init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Splash erst verbergen, wenn Auth-Init durch ist
  useEffect(() => {
    if (!auth.loading && !splashHidden) {
      SplashScreen.hideAsync()
        .catch(() => undefined)
        .finally(() => setSplashHidden(true));
    }
  }, [auth.loading, splashHidden]);

  const authValue = useMemo(
    () => ({
      user: auth.user,
      loading: auth.loading,
      login: auth.login,
      logout: auth.logout,
      isAuthenticated: auth.isAuthenticated,
    }),
    [auth.user, auth.loading, auth.login, auth.logout, auth.isAuthenticated],
  );

  if (auth.loading) {
    // Splash bleibt sichtbar — leeres Render, kein Flash
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthContext.Provider value={authValue}>
            <NavigationContainer linking={linking}>
              <AppNavigator />
              <StatusBar style="dark" backgroundColor={colors.background} />
            </NavigationContainer>
            <NetworkBanner />
          </AuthContext.Provider>
        </QueryProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// Sentry.wrap aktiviert automatisches Profiling + Touch-Event-Tracking
export default Sentry.wrap(App);
