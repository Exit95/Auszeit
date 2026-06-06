// Admin API Client — verwendet Basic Auth gegen die Astro-Backend-Endpunkte.
// Credentials werden per expo-secure-store verschlüsselt gespeichert
// (Android: EncryptedSharedPreferences, iOS: Keychain). KEIN AsyncStorage!

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL =
  (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_API_HOST) ||
  'https://keramik-auszeit.de';
const CREDS_KEY = 'admin_credentials';
const LEGACY_ASYNC_KEY = 'admin_credentials'; // gleicher Key, migriert aus AsyncStorage

class AdminApiClient {
  private credentials: string | null = null; // base64(user:pass)

  async init(): Promise<void> {
    this.credentials = await SecureStore.getItemAsync(CREDS_KEY);

    // One-time Migration: alte AsyncStorage-Creds in SecureStore übernehmen
    if (!this.credentials) {
      try {
        const legacy = await AsyncStorage.getItem(LEGACY_ASYNC_KEY);
        if (legacy) {
          await SecureStore.setItemAsync(CREDS_KEY, legacy);
          await AsyncStorage.removeItem(LEGACY_ASYNC_KEY);
          this.credentials = legacy;
        }
      } catch {
        // Migration optional — bei Fehler einfach ohne fortfahren
      }
    }
  }

  async setCredentials(username: string, password: string): Promise<void> {
    const encoded = btoa(`${username}:${password}`);
    this.credentials = encoded;
    await SecureStore.setItemAsync(CREDS_KEY, encoded);
  }

  async clearCredentials(): Promise<void> {
    this.credentials = null;
    await SecureStore.deleteItemAsync(CREDS_KEY);
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

  async put<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
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
