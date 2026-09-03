import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { authApi } from '@/api/auth';
import { setAuthToken, setUnauthorizedHandler } from '@/api/client';
import { AUTH_TOKEN_KEY, DEVICE_NAME } from '@/constants/config';
import type { AuthUser } from '@/types/auth';
import { logError } from '@/utils/errors';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** true mientras se restaura la sesión al abrir la app (splash). */
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

async function persistToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

async function clearPersistedToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    logError('SecureStore.deleteItemAsync', error);
  }
}

export const useAuthStore = create<AuthState>((set) => {
  function clearSessionState() {
    setAuthToken(null);
    set({ token: null, user: null, isAuthenticated: false });
  }

  // Cualquier 401 de cualquier endpoint autenticado expulsa la sesión.
  setUnauthorizedHandler(() => {
    void clearPersistedToken();
    clearSessionState();
  });

  return {
    token: null,
    user: null,
    isAuthenticated: false,
    isInitializing: true,

    async login(email, password) {
      const response = await authApi.login({ email, password, device_name: DEVICE_NAME });
      setAuthToken(response.token);
      await persistToken(response.token);

      const user = response.usuario ?? response.user ?? (await authApi.me());
      set({ token: response.token, user, isAuthenticated: true });
    },

    async logout() {
      try {
        await authApi.logout();
      } catch (error) {
        logError('authApi.logout', error);
      } finally {
        await clearPersistedToken();
        clearSessionState();
      }
    },

    async restoreSession() {
      try {
        const storedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        if (!storedToken) {
          set({ isInitializing: false });
          return;
        }

        setAuthToken(storedToken);
        const user = await authApi.me();
        set({ token: storedToken, user, isAuthenticated: true, isInitializing: false });
      } catch (error) {
        logError('authStore.restoreSession', error);
        await clearPersistedToken();
        clearSessionState();
        set({ isInitializing: false });
      }
    },
  };
});
