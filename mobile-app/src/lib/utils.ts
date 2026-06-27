export function getApiHost(): string {
  return (
    (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_API_HOST) ||
    'https://keramik-auszeit.de'
  );
}

export function getErrorMessage(err: unknown, fallback = 'Unbekannter Fehler'): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || fallback;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message: unknown }).message;
    if (typeof msg === 'string' && msg) return msg;
  }
  return fallback;
}
