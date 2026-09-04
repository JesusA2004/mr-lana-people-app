import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { dispositivosApi } from '@/api/dispositivos';
import { DEVICE_NAME } from '@/constants/config';
import { logError } from '@/utils/errors';
import { supportsRemotePush } from '@/utils/runtime';

/**
 * Toda la lógica de push vive aquí, como servicio plano — NO como hook de
 * React — para que `authStore` (usado desde el login y desde la raíz de la
 * app) pueda revocar el token al cerrar sesión sin importar un hook ni,
 * sobre todo, sin arrastrar `expo-notifications` a un módulo que se carga
 * siempre. `expo-notifications` solo se importa dinámicamente, y solo
 * después de confirmar `supportsRemotePush` — nunca a nivel de módulo.
 *
 * Causa raíz del crash en Expo Go: `expo-notifications` lanza una
 * excepción real (no solo un warning) en Android en cuanto se llama a
 * cualquier función relacionada con el token de push remoto
 * (`getExpoPushTokenAsync`, `getDevicePushTokenAsync`,
 * `addPushTokenListener`) estando en Expo Go — ver
 * `warnOfExpoGoPushUsage()` dentro del propio paquete. El bug no era el
 * `import * as Notifications` en sí (ese solo imprime un `console.warn`),
 * sino que la detección de Expo Go basada en `Constants.appOwnership`
 * podía no coincidir con `'expo'` y dejaba pasar la llamada real. Por eso
 * ahora se usa `isRunningInExpoGo()` (mismo helper que usa el propio
 * `expo-notifications` internamente, ver `src/utils/runtime.ts`).
 */

let lastRegisteredToken: string | null = null;
let notificationHandlerConfigured = false;

async function configureNotificationHandler(): Promise<void> {
  if (notificationHandlerConfigured) return;
  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  notificationHandlerConfigured = true;
}

/** Pide permiso, obtiene el Expo Push Token y lo registra en el backend. No hace nada (ni lanza) en Expo Go/web. */
export async function registerCurrentPushToken(): Promise<void> {
  if (!supportsRemotePush) {
    if (__DEV__) {
      console.log('[Push] Deshabilitado en Expo Go. Usa un Development Build para probar push remoto.');
    }
    return;
  }
  if (!Device.isDevice) return;

  try {
    const Notifications = await import('expo-notifications');
    await configureNotificationHandler();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    await dispositivosApi.registerPushToken({
      token: expoPushToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      device_name: Device.modelName ?? DEVICE_NAME,
    });
    lastRegisteredToken = expoPushToken;
  } catch (error) {
    // Nunca debe interrumpir la sesión: el backend puede no tener el
    // endpoint todavía (ver docs/MOBILE_BACKEND_REQUIREMENTS.md P0.7), o el
    // dispositivo puede no soportar push.
    logError('registerCurrentPushToken', error);
  }
}

/** Revoca el token del dispositivo actual (best-effort). Usado por authStore al cerrar sesión. */
export async function revokeCurrentPushToken(): Promise<void> {
  if (!lastRegisteredToken) return;
  try {
    await dispositivosApi.revokePushToken(lastRegisteredToken);
  } catch (error) {
    logError('revokeCurrentPushToken', error);
  } finally {
    lastRegisteredToken = null;
  }
}
