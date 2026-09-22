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
import { AppError, isTransientError, logError } from '@/utils/errors';

/** Plazo para avisar al backend del logout: salir de la cuenta nunca espera más que esto por la red. */
export const LOGOUT_REQUEST_TIMEOUT_MS = 5000;
/** Plazo para verificar `/me` al abrir la app: pasado esto se trata como "sin conexión", nunca como sesión inválida. */
export const RESTORE_REQUEST_TIMEOUT_MS = 10000;
/** SecureStore puede colgarse en algunos Android con el keystore dañado: nunca debe dejar el splash infinito. */
const SECURE_STORE_TIMEOUT_MS = 5000;

export const SESSION_PERSIST_ERROR_MESSAGE =
  'No pudimos guardar tu sesión de forma segura en este dispositivo. Inténtalo de nuevo; si continúa, reinicia la app.';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** true mientras se restaura la sesión al abrir la app (splash). */
  isInitializing: boolean;
  /**
   * Hay un token guardado pero `/me` no pudo verificarse por red/servidor
   * (sin internet, timeout, 5xx/429). NO es una sesión expirada: se muestra
   * "No pudimos verificar tu sesión" con Reintentar, y se reintenta sola al
   * volver la conexión. Solo un 401 real borra la sesión.
   */
  pendingVerification: boolean;
  /** true mientras un reintento de verificación está en curso. */
  isVerifying: boolean;
  isLoggingOut: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Aplica una sesión ya obtenida fuera de /login (ver registro por QR en incorporacion/qr/[token].tsx). */
  loginWithToken: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  /** Reintenta verificar la sesión pendiente (botón Reintentar / NetInfo recuperó conexión). */
  retrySessionVerification: () => Promise<void>;
  /** Descarta la sesión guardada sin verificar (ej. "Entrar con otra cuenta"). */
  discardPendingSession: () => Promise<void>;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}: timeout`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function persistToken(token: string): Promise<void> {
  try {
    await withTimeout(SecureStore.setItemAsync(AUTH_TOKEN_KEY, token), SECURE_STORE_TIMEOUT_MS, 'SecureStore.setItemAsync');
  } catch (error) {
    throw new AppError(SESSION_PERSIST_ERROR_MESSAGE, { cause: error });
  }
}

async function clearPersistedToken(): Promise<void> {
  try {
    await withTimeout(SecureStore.deleteItemAsync(AUTH_TOKEN_KEY), SECURE_STORE_TIMEOUT_MS, 'SecureStore.deleteItemAsync');
  } catch (error) {
    logError('SecureStore.deleteItemAsync', error);
  }
}

/** Nunca lanza: una falla de SecureStore al leer se trata como "sin sesión guardada" (lleva a Login, nunca a un splash infinito). */
async function readPersistedToken(): Promise<string | null> {
  try {
    return await withTimeout(SecureStore.getItemAsync(AUTH_TOKEN_KEY), SECURE_STORE_TIMEOUT_MS, 'SecureStore.getItemAsync');
  } catch (error) {
    logError('SecureStore.getItemAsync', error);
    return null;
  }
}

/** Ejecuta un paso de limpieza sin dejar que una falla corte los siguientes. */
function safely(label: string, step: () => unknown): void {
  try {
    const result = step();
    if (result instanceof Promise) result.catch((error: unknown) => logError(label, error));
  } catch (error) {
    logError(label, error);
  }
}

export const useAuthStore = create<AuthState>((set, get) => {
  /**
   * Borra TODO el estado local de la sesión. Cada paso va aislado: si uno
   * falla (p. ej. SecureStore), los demás se ejecutan igual — el usuario
   * siempre queda fuera de su cuenta.
   */
  function clearSessionState() {
    setAuthToken(null);
    set({ token: null, user: null, isAuthenticated: false, pendingVerification: false, isVerifying: false });
    // Datos del colaborador anterior no deben sobrevivir en caché si otra persona inicia sesión en el mismo dispositivo.
    safely('queryClient.clear', () => queryClient.clear());
    // No dejar el auto-lock esperando un desbloqueo que ya no aplica.
    safely('appLock.reset', () => useAppLockStore.getState().reset());
    // No filtrar la experiencia (Mi espacio/Gestión RH) a la siguiente cuenta.
    safely('experience.reset', () => useExperienceStore.getState().reset());
    // Una navegación pendiente de un push nunca debe disparar en la sesión de otra cuenta.
    safely('pendingNavigation.clear', () => clearPendingPushNavigation());
  }

  // Cualquier 401 de cualquier endpoint autenticado expulsa la sesión.
  setUnauthorizedHandler(() => {
    void clearPersistedToken();
    clearSessionState();
  });

  async function verifyStoredToken(storedToken: string): Promise<void> {
    setAuthToken(storedToken);
    try {
      const user = await authApi.me({ timeout: RESTORE_REQUEST_TIMEOUT_MS });
      set({ token: storedToken, user, isAuthenticated: true, pendingVerification: false });
    } catch (error) {
      logError('authStore.verifyStoredToken', error);
      if (isTransientError(error)) {
        // Sesión probablemente válida pero imposible de confirmar ahora: se
        // conserva el token guardado y NO se hacen peticiones autenticadas
        // hasta verificarla (Axios sin Bearer mientras tanto).
        setAuthToken(null);
        set({ token: null, user: null, isAuthenticated: false, pendingVerification: true });
        return;
      }
      // 401 (ya lo limpió el interceptor) o rechazo definitivo: fuera.
      await clearPersistedToken();
      clearSessionState();
    }
  }

  return {
    token: null,
    user: null,
    isAuthenticated: false,
    isInitializing: true,
    pendingVerification: false,
    isVerifying: false,
    isLoggingOut: false,

    async login(email, password) {
      const response = await authApi.login({ email, password, device_name: DEVICE_NAME });
      const token = response.token;

      // Axios y Zustand deben cambiar juntos: si cualquier paso posterior
      // falla, se deshace todo (sin sesión a medias: Bearer puesto pero la
      // app diciendo "no autenticado", o token guardado sin usuario).
      try {
        setAuthToken(token);
        const user = response.usuario ?? response.user ?? (await authApi.me());
        await persistToken(token);
        set({ token, user, isAuthenticated: true, pendingVerification: false });
      } catch (error) {
        setAuthToken(null);
        await clearPersistedToken();
        // Best-effort: invalidar en el backend el token que ya no se usará.
        const orphanToken = token;
        setAuthToken(orphanToken);
        await authApi.logout({ timeout: LOGOUT_REQUEST_TIMEOUT_MS }).catch((logoutError: unknown) => logError('login.rollback.logout', logoutError));
        setAuthToken(null);
        throw error;
      }
    },

    async loginWithToken(token, user) {
      try {
        setAuthToken(token);
        await persistToken(token);
        set({ token, user, isAuthenticated: true, pendingVerification: false });
      } catch (error) {
        setAuthToken(null);
        await clearPersistedToken();
        throw error;
      }
    },

    async logout() {
      if (get().isLoggingOut) return;
      set({ isLoggingOut: true });
      try {
        // 1) Revocar el push token de este dispositivo (nunca lanza).
        try {
          await revokeCurrentPushToken();
        } catch (error) {
          logError('logout.revokePush', error);
        }
        // 2) Invalidar el token en el backend (sin red / 5xx: se ignora).
        try {
          await authApi.logout({ timeout: LOGOUT_REQUEST_TIMEOUT_MS });
        } catch (error) {
          logError('authApi.logout', error);
        }
      } finally {
        // 3) SIEMPRE: borrar token local y todo el estado de la sesión.
        await clearPersistedToken();
        clearSessionState();
        set({ isLoggingOut: false });
      }
    },

    async restoreSession() {
      try {
        const storedToken = await readPersistedToken();
        if (storedToken) await verifyStoredToken(storedToken);
      } catch (error) {
        // Defensa final: nada aquí debe dejar el splash abierto.
        logError('authStore.restoreSession', error);
      } finally {
        set({ isInitializing: false });
      }
    },

    async retrySessionVerification() {
      const { pendingVerification, isVerifying } = get();
      if (!pendingVerification || isVerifying) return;
      set({ isVerifying: true });
      try {
        const storedToken = await readPersistedToken();
        if (!storedToken) {
          clearSessionState();
          return;
        }
        await verifyStoredToken(storedToken);
      } finally {
        set({ isVerifying: false });
      }
    },

    async discardPendingSession() {
      await clearPersistedToken();
      clearSessionState();
    },
  };
});
