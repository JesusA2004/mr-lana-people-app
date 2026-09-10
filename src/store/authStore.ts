import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { authApi } from '@/api/auth';
import { setAuthToken, setUnauthorizedHandler } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { AUTH_TOKEN_KEY, DEVICE_NAME } from '@/constants/config';
import { revokeCurrentPushToken } from '@/services/pushNotifications';
import { useAppLockStore } from '@/store/appLockStore';
import { useExperienceStore } from '@/store/experienceStore';
import { clearPendingPushNavigation } from '@/store/pendingNavigationStore';
import type { AuthUser } from '@/types/auth';
import { logError, normalizeError } from '@/utils/errors';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** true mientras se restaura la sesión al abrir la app (splash). */
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Aplica una sesión ya obtenida fuera de /login (ver registro por QR en incorporacion/qr/[token].tsx). */
  loginWithToken: (token: string, user: AuthUser) => Promise<void>;
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
    // Evita que datos del colaborador anterior sobrevivan en caché de
    // react-query si otra persona inicia sesión en el mismo dispositivo.
    queryClient.clear();
    // No dejar el auto-lock (V3 sección 46) esperando un desbloqueo que ya no aplica.
    useAppLockStore.getState().reset();
    // No filtrar la experiencia (Mi espacio/Gestión RH) elegida por esta
    // cuenta a la siguiente que inicie sesión en el mismo dispositivo.
    void useExperienceStore.getState().reset();
    // Una navegación pendiente de un push (AGENTS.md sección 11/13) que
    // nunca se resolvió no debe sobrevivir a un logout ni disparar en la
    // sesión de la siguiente cuenta.
    clearPendingPushNavigation();
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

    async loginWithToken(token, user) {
      setAuthToken(token);
      await persistToken(token);
      set({ token, user, isAuthenticated: true });
    },

    async logout() {
      await revokeCurrentPushToken();
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

        // Bug corregido: antes CUALQUIER falla de `/me` (incluida una sin
        // conexión, timeout, o el backend caído/503) cerraba la sesión y
        // borraba el token guardado — un colaborador que abriera la app sin
        // internet quedaba deslogeado aunque su sesión siguiera siendo
        // válida. Solo un token realmente inválido (401, o cualquier otra
        // respuesta real del servidor que no sea un problema transitorio)
        // debe limpiar la sesión; un error de red/servidor solo debe dejar
        // a la persona sin entrar todavía, reintentando con el mismo token
        // la próxima vez que haya conexión.
        const { status, isNetworkError } = normalizeError(error);
        const isTransient = isNetworkError || (status !== undefined && status >= 500);

        if (isTransient) {
          setAuthToken(null);
          set({ isAuthenticated: false, isInitializing: false });
          return;
        }

        await clearPersistedToken();
        clearSessionState();
        set({ isInitializing: false });
      }
    },
  };
});
