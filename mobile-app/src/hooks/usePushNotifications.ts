import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { adminApi } from '../api/adminClient';

if (Platform.OS !== 'web') {
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true, // Backwards-Compat für SDK 52
  }),
});
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    if (__DEV__) console.warn('[Push] Nur auf echten Geräten verfügbar');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.warn('[Push] Berechtigung verweigert');
    return null;
  }

  // Android: Notification Channel vor erstem Token-Request registrieren
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Buchungen',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A0522D',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  if (!projectId) {
    if (__DEV__) console.warn('[Push] EAS projectId fehlt in app.json');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return token;
}

interface UsePushOptions {
  enabled: boolean;
}

export function usePushNotifications({ enabled }: UsePushOptions) {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return; // Nur registrieren wenn User auth'd ist

    let cancelled = false;

    registerForPushNotifications().then(async (token) => {
      if (cancelled || !token) return;
      try {
        await adminApi.post('/api/admin/push-token', { token, platform: Platform.OS });
      } catch (err) {
        if (__DEV__) console.warn('[Push] Token-Registrierung fehlgeschlagen:', err);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) console.warn('[Push] empfangen:', notification.request.content.title);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (__DEV__) console.warn('[Push] getippt:', response.notification.request.content.title);
        // Deep-Link wird durch React Navigation linking-config (App.tsx) verarbeitet,
        // sobald die Notification-Payload eine `url` enthält.
      }
    );

    return () => {
      cancelled = true;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [enabled]);
}
