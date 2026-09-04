/**
 * Configuración centralizada de la app. Ningún módulo debe leer
 * `process.env.EXPO_PUBLIC_API_URL` directamente fuera de este archivo.
 */

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

/** true si EXPO_PUBLIC_API_URL fue definida (ver .env / .env.example). */
export const IS_API_URL_CONFIGURED = Boolean(rawApiUrl);

if (!IS_API_URL_CONFIGURED && __DEV__) {
  console.error(
    '[Config] Falta la variable de entorno EXPO_PUBLIC_API_URL. ' +
      'Copia .env.example a .env y define la IP de tu red local, por ejemplo: ' +
      'EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1 (no uses "localhost" en dispositivo físico).',
  );
}

export const API_URL = rawApiUrl ?? '';

export const APP_NAME = 'MR. LANA PEOPLE';
export const DEVICE_NAME = 'app-movil';
export const REQUEST_TIMEOUT_MS = 15000;
export const AUTH_TOKEN_KEY = 'mrlana-auth-token';

/**
 * Avatar ilustrado de desarrollo cuando no hay foto real disponible (ver
 * `ProfileAvatar`). Se activa por defecto en DEV (se puede apagar con
 * EXPO_PUBLIC_SHOW_DEMO_PROFILE_PHOTO=false) y queda **forzado a false**
 * fuera de DEV sin importar el env — nunca debe llegar a producción, ni por
 * un .env mal copiado.
 */
export const SHOW_DEMO_PROFILE_PHOTO = __DEV__ && process.env.EXPO_PUBLIC_SHOW_DEMO_PROFILE_PHOTO !== 'false';
