import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminApi } from './adminClient';

import { getApiHost } from '../lib/utils';

// Auch im Dev-Modus auf Live-API, da DB nur auf dem Server läuft.
// EXPO_PUBLIC_API_HOST erlaubt lokalen CORS-Proxy im Web-Dev-Build.
const API_HOST = getApiHost();
const API_BASE = `${API_HOST}/api/admin/brenn`;

// Die Brenn-Endpoints erwarten serverseitig Basic-Auth
// (siehe src/lib/server/brenn/auth.ts → checkAuth).
// Wir teilen die Credentials mit dem adminApi-Client, damit ein einziger
// Admin-Login sowohl Atelier- als auch Brenn-Endpoints freischaltet.
const TOKEN_KEY = 'auth_token';

class ApiClient {
  private token: string | null = null;

  async init(): Promise<void> {
    this.token = await SecureStore.getItemAsync(TOKEN_KEY);

    // Migration: alte AsyncStorage-Tokens übernehmen
    if (!this.token) {
      try {
        const legacy = await AsyncStorage.getItem(TOKEN_KEY);
        if (legacy) {
          await SecureStore.setItemAsync(TOKEN_KEY, legacy);
          await AsyncStorage.removeItem(TOKEN_KEY);
          this.token = legacy;
        }
      } catch {
        // Migration optional
      }
    }
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }

  async clearToken(): Promise<void> {
    this.token = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    isFormData = false
  ): Promise<T> {
    const headers: Record<string, string> = {};

    // Erst Basic-Auth (neuer Weg), sonst Bearer (Legacy-Fallback)
    const basicCreds = adminApi.getCredentials();
    if (basicCreds) {
      headers['Authorization'] = `Basic ${basicCreds}`;
    } else if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body) {
      config.body = isFormData ? (body as FormData) : JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${path}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Netzwerkfehler' }));
      throw new ApiError(response.status, error.error || 'Unbekannter Fehler', error.details);
    }

    return response.json();
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  async uploadImages(orderId: number, uris: string[]): Promise<unknown> {
    const formData = new FormData();
    uris.forEach((uri, index) => {
      const filename = uri.split('/').pop() || `image_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('images', {
        uri,
        name: filename,
        type,
      } as unknown as Blob);
    });

    return this.request('POST', `/orders/${orderId}/images`, formData, true);
  }

  getImageUrl(filePath: string): string {
    return `https://keramik-auszeit.de/uploads/${filePath}`;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient();
