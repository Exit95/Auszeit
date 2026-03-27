// Admin API Client — verwendet Basic Auth gegen die Astro-Backend-Endpunkte
// Die Credentials sind dieselben wie im Web-Admin (admin:ADMIN_PASSWORD)
// Da in der App kein TOTP nötig ist, nutzen wir das superuser-Konto.
// Die Credentials werden per Base64 kodiert und als Basic Auth Header mitgeschickt.
//
// ACHTUNG: Aktuell sind die Credentials hardcoded auf 'admin' + leeres Passwort,
// da kein separates Auth-System für die App existiert. Die /api/admin/bookings
// Endpunkte prüfen per validateCredentials() — was admin:ADMIN_PASSWORD oder
// superuser:SUPERUSER_PASSWORD akzeptiert. Da wir das Passwort nicht kennen,
// versuchen wir zuerst ohne Auth — der Endpunkt kann nur 401 zurückgeben.
//
// Stattdessen: Wir speichern die Credentials in AsyncStorage nach Login.

import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://keramik-auszeit.de';
const CREDS_KEY = 'admin_credentials';

class AdminApiClient {
  private credentials: string | null = null; // base64(user:pass)

  async init(): Promise<void> {
    this.credentials = await AsyncStorage.getItem(CREDS_KEY);
  }

  async setCredentials(username: string, password: string): Promise<void> {
    const encoded = btoa(`${username}:${password}`);
    this.credentials = encoded;
    await AsyncStorage.setItem(CREDS_KEY, encoded);
  }

  async clearCredentials(): Promise<void> {
    this.credentials = null;
    await AsyncStorage.removeItem(CREDS_KEY);
  }

  getCredentials(): string | null {
    return this.credentials;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.credentials) {
      headers['Authorization'] = `Basic ${this.credentials}`;
    }
    return headers;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    let url = `${BASE_URL}${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += `?${qs}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: this.buildHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Netzwerkfehler' }));
      throw new AdminApiError(response.status, err.error || 'Unbekannter Fehler');
    }
    return response.json();
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Netzwerkfehler' }));
      throw new AdminApiError(response.status, err.error || 'Unbekannter Fehler');
    }
    return response.json();
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Netzwerkfehler' }));
      throw new AdminApiError(response.status, err.error || 'Unbekannter Fehler');
    }
    return response.json();
  }

  async delete<T>(path: string, params?: Record<string, string>): Promise<T> {
    let url = `${BASE_URL}${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += `?${qs}`;
    }
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.buildHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Netzwerkfehler' }));
      throw new AdminApiError(response.status, err.error || 'Unbekannter Fehler');
    }
    return response.json();
  }
}

export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export const adminApi = new AdminApiClient();
