import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { dispositivosApi } from '@/api/dispositivos';
import { DEVICE_NAME } from '@/constants/config';
import { logError } from '@/utils/errors';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let lastRegisteredToken: string | null = null;

/** Usado por authStore al cerrar sesión para revocar el token del dispositivo (best-effort). */
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

/**
 * Registro de push notifications (AGENTS.md secciones 25-27).
 *
 * Limitaciones reales de Expo SDK 57 verificadas antes de escribir esto:
 * - Expo Go YA NO soporta remote push notifications (solo local) desde el
 *   SDK 53 en adelante — `getExpoPushTokenAsync` falla o no tiene sentido
 *   ahí. Por eso este hook detecta Expo Go (`Constants.appOwnership ===
 *   'expo'`) y se sale sin pedir permiso ni token: hace falta un
 *   Development Build (`eas build --profile development`) para probar push
 *   real en un dispositivo.
 * - El backend NO tiene todavía los endpoints `POST/DELETE
 *   /dispositivos/push-token` (ver docs/MOBILE_BACKEND_REQUIREMENTS.md, P0)
 *   — el POST de este hook está preparado pero fallará (404) hasta que se
 *   agreguen; el error se traga silenciosamente para nunca afectar login.
 */
export function usePushRegistration(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS === 'web') return;
    if (Constants.appOwnership === 'expo') {
      if (__DEV__) {
        console.log('[Push] Expo Go no soporta push remoto (SDK 53+). Usa un Development Build para probarlo.');
      }
      return;
    }
    if (!Device.isDevice) return;

    (async () => {
      try {
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
        const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );

        await dispositivosApi.registerPushToken({
          token: expoPushToken,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          device_name: Device.modelName ?? DEVICE_NAME,
        });
        lastRegisteredToken = expoPushToken;
      } catch (error) {
        // Nunca debe interrumpir la sesión: el backend puede no tener el
        // endpoint todavía, o el dispositivo puede no soportar push.
        logError('usePushRegistration', error);
      }
    })();
  }, [enabled]);
}
