import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Sentry-DSN wird über EXPO_PUBLIC_SENTRY_DSN env var gesetzt.
// Ohne DSN bleibt Sentry init() ein No-Op — Crashes werden nicht erfasst,
// die App läuft aber normal weiter.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (!SENTRY_DSN) {
    if (__DEV__) console.warn('[Sentry] EXPO_PUBLIC_SENTRY_DSN nicht gesetzt — Crashes werden nicht erfasst');
    return;
  }
  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
    release: Constants.expoConfig?.version,
    dist: String(Constants.expoConfig?.runtimeVersion ?? '1'),
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    enabled: !__DEV__, // im Dev nicht senden
  });
  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export { Sentry };
