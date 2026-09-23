import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { dispositivosApi } from '@/api/dispositivos';
import { DEVICE_NAME } from '@/constants/config';
import { usePushDiagnosticsStore, type PushPermissionState } from '@/store/pushDiagnosticsStore';
import { getCurrentVersionLabel } from '@/utils/appVersion';
import { getErrorMessage, logError } from '@/utils/errors';
import { supportsRemotePush } from '@/utils/runtime';

/**
 * Toda la lógica de push vive aquí, como servicio plano — NO como hook de
 * React — para que `authStore` pueda revocar el token al cerrar sesión sin
 * arrastrar `expo-notifications` a un módulo que se carga siempre.
 * `expo-notifications` solo se importa dinámicamente, y solo después de
 * confirmar `supportsRemotePush` (en Expo Go las funciones de token remoto
 * lanzan una excepción real en Android, ver `src/utils/runtime.ts`).
 */

/** Token Expo registrado en el backend. Se persiste para poder revocarlo al cerrar sesión aunque la app se haya reiniciado. */
const PUSH_TOKEN_KEY = 'mrlana-push-token';

/**
 * Canales Android (deben existir ANTES de pedir el permiso: en Android 13+
 * el diálogo del sistema no aparece hasta que la app crea al menos un
 * canal). `default` ya existía en instalaciones previas — se conserva el id
 * y solo se renombra; su importancia original no puede cambiarse desde la
 * app (restricción de Android), por eso los pendientes que piden acción van
 * por un canal propio de importancia alta. El backend elige el canal por
 * tipo (`config/expo.php`: canal_general / canal_acciones).
 */
export const PUSH_CHANNELS = {
  general: { id: 'default', name: 'Notificaciones de People', description: 'Avisos generales: recibos, cumpleaños, actualizaciones de tus solicitudes.' },
  acciones: { id: 'acciones', name: 'Pendientes por atender', description: 'Documentos por firmar, vistos buenos, evaluaciones y pendientes de RH.' },
} as const;

let notificationHandlerConfigured = false;
let channelsConfigured = false;
let inFlightRegistration: Promise<PushRegistrationResult> | null = null;

type NotificationsModule = typeof import('expo-notifications');

/**
 * Carga perezosa: el módulo nativo solo se evalúa la primera vez que se
 * necesita (nunca en Expo Go, ver `supportsRemotePush`). `require` en vez de
 * `import()` para que Jest pueda cargarlo; en Metro ambos son equivalentes.
 */
async function loadNotifications(): Promise<NotificationsModule> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as NotificationsModule;
}

/**
 * Foreground: la app muestra su propio aviso (toast con "Ver", ver
 * `useNotificationResponseRouting`) — el banner del sistema encima sería un
 * duplicado. Se deja en la bandeja (`shouldShowList`) para poder tocarlo
 * después, sin sonido para no interrumpir a quien ya está usando la app.
 */
export async function configureNotificationHandler(): Promise<void> {
  if (notificationHandlerConfigured || !supportsRemotePush) return;
  const Notifications = await loadNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  notificationHandlerConfigured = true;
}

async function ensureAndroidChannels(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android' || channelsConfigured) return;
  await Notifications.setNotificationChannelAsync(PUSH_CHANNELS.general.id, {
    name: PUSH_CHANNELS.general.name,
    description: PUSH_CHANNELS.general.description,
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync(PUSH_CHANNELS.acciones.id, {
    name: PUSH_CHANNELS.acciones.name,
    description: PUSH_CHANNELS.acciones.description,
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 200, 120, 200],
  });
  channelsConfigured = true;
}

/** Traduce el permiso nativo a un estado simple. iOS "provisional" entrega en silencio a la bandeja: cuenta como permitido. */
export function toPermissionState(result: { status: string; ios?: { status?: number } | null }): PushPermissionState {
  // IosAuthorizationStatus.PROVISIONAL = 3, EPHEMERAL = 4.
  if (result.ios?.status === 3 || result.ios?.status === 4) return 'provisional';
  if (result.status === 'granted') return 'granted';
  if (result.status === 'denied') return 'denied';
  if (result.status === 'undetermined') return 'undetermined';
  return 'unknown';
}

export function isPermissionUsable(state: PushPermissionState): boolean {
  return state === 'granted' || state === 'provisional';
}

/** projectId real del proyecto EAS — sin él Expo no emite un token válido para este build. */
export function resolveEasProjectId(): string | null {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: unknown } } | undefined)?.eas?.projectId;
  const fromEas = (Constants.easConfig as { projectId?: unknown } | null | undefined)?.projectId;
  const projectId = typeof fromExtra === 'string' && fromExtra ? fromExtra : typeof fromEas === 'string' && fromEas ? fromEas : null;
  return projectId;
}

export interface RegisterPushTokenOptions {
  /**
   * Si el permiso todavía se puede pedir, dispara el diálogo nativo. Default
   * `false` — el registro automático al abrir la app NUNCA sorprende con el
   * diálogo del sistema sin la explicación previa (`PushPermissionPrimer`).
   */
  promptIfUndetermined?: boolean;
}

export type PushRegistrationResult =
  | { status: 'registered'; token: string }
  | { status: 'unsupported' | 'simulator' | 'no_permission' | 'no_project_id' | 'error'; message?: string };

async function persistToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  } catch (error) {
    logError('pushNotifications.persistToken', error);
  }
}

async function readPersistedToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function registerOnce(options: RegisterPushTokenOptions): Promise<PushRegistrationResult> {
  const diagnostics = usePushDiagnosticsStore.getState();

  if (!supportsRemotePush) {
    diagnostics.setPermission('unsupported');
    return { status: 'unsupported', message: 'Push remoto no disponible en Expo Go ni en web. Usa un Development Build o el APK.' };
  }
  if (!Device.isDevice) {
    diagnostics.setPermission('unsupported');
    return { status: 'simulator', message: 'Los simuladores/emuladores sin Google Play no reciben push remoto.' };
  }

  try {
    const Notifications = await loadNotifications();
    await configureNotificationHandler();
    await ensureAndroidChannels(Notifications);

    const existing = await Notifications.getPermissionsAsync();
    let state = toPermissionState(existing);

    // `canAskAgain` (no solo `undetermined`) decide si el sistema volverá a
    // mostrar el diálogo: en Android 13+ el primer chequeo puede llegar
    // `denied` con `canAskAgain: true`. Si ya fue rechazado de forma
    // definitiva no se insiste — Configuración ofrece "Abrir ajustes".
    if (!isPermissionUsable(state) && existing.canAskAgain && options.promptIfUndetermined) {
      const requested = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      state = toPermissionState(requested);
    }
    diagnostics.setPermission(state);

    if (!isPermissionUsable(state)) return { status: 'no_permission' };

    const projectId = resolveEasProjectId();
    diagnostics.setProjectId(projectId);
    if (!projectId) {
      const message = 'Este build no trae el projectId de EAS (app.json → extra.eas.projectId).';
      diagnostics.setError(message);
      return { status: 'no_project_id', message };
    }

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (typeof expoPushToken !== 'string' || expoPushToken.trim() === '') {
      const message = 'Expo devolvió un token vacío.';
      diagnostics.setError(message);
      return { status: 'error', message };
    }

    // Idempotente en backend (updateOrCreate por token): re-registrar en cada
    // apertura actualiza last_seen_at y reasigna el token si otra cuenta
    // inició sesión en este teléfono — nunca crea registros duplicados.
    await dispositivosApi.registerPushToken({
      token: expoPushToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      device_name: Device.modelName ?? DEVICE_NAME,
      app_version: getCurrentVersionLabel().slice(0, 20),
    });
    await persistToken(expoPushToken);
    diagnostics.setRegistered(expoPushToken, projectId);
    return { status: 'registered', token: expoPushToken };
  } catch (error) {
    // Nunca interrumpe la sesión: sin red, Expo caído o dispositivo sin
    // Google Play Services. Queda en el diagnóstico y se reintenta en la
    // próxima apertura / rotación de token.
    logError('registerCurrentPushToken', error);
    const message = getErrorMessage(error);
    diagnostics.setError(message);
    return { status: 'error', message };
  }
}

/**
 * Obtiene el Expo Push Token y lo registra en el backend. No lanza nunca.
 * Llamadas concurrentes (inicio + rotación de token + primer de permiso)
 * comparten la misma petición en vuelo.
 */
export async function registerCurrentPushToken(options: RegisterPushTokenOptions = {}): Promise<PushRegistrationResult> {
  if (inFlightRegistration && !options.promptIfUndetermined) return inFlightRegistration;
  const run = registerOnce(options).finally(() => {
    if (inFlightRegistration === run) inFlightRegistration = null;
  });
  inFlightRegistration = run;
  return run;
}

export type PushPermissionSnapshot = { status: 'granted' | 'denied' | 'undetermined'; canAskAgain: boolean; provisional?: boolean } | { status: 'unsupported' };

/** Estado actual del permiso de push, sin disparar ningún diálogo — usado por el primer de permiso y por Configuración. */
export async function getPushPermissionStatusAsync(): Promise<PushPermissionSnapshot> {
  if (!supportsRemotePush) return { status: 'unsupported' };
  try {
    const Notifications = await loadNotifications();
    const result = await Notifications.getPermissionsAsync();
    const state = toPermissionState(result);
    usePushDiagnosticsStore.getState().setPermission(state);
    return { status: result.status, canAskAgain: result.canAskAgain, provisional: state === 'provisional' };
  } catch (error) {
    logError('getPushPermissionStatusAsync', error);
    return { status: 'unsupported' };
  }
}

/** Plazo máximo para intentar revocar al cerrar sesión: el logout local nunca espera más que esto por la red. */
export const PUSH_REVOKE_TIMEOUT_MS = 5000;

/**
 * Revoca en el backend el token de ESTE dispositivo (best-effort) y lo
 * olvida localmente. NUNCA lanza: `authStore.logout` lo llama antes de
 * cerrar sesión y un fallo aquí jamás debe impedir salir de la cuenta. Si
 * no se pudo revocar (sin red), el siguiente login en este teléfono
 * reasigna el token a la nueva cuenta (updateOrCreate por token).
 */
export async function revokeCurrentPushToken(): Promise<void> {
  try {
    const token = usePushDiagnosticsStore.getState().token ?? (await readPersistedToken());
    if (token) {
      await dispositivosApi.revokePushToken(token, { timeout: PUSH_REVOKE_TIMEOUT_MS });
    }
  } catch (error) {
    logError('revokeCurrentPushToken', error);
  } finally {
    try {
      await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    } catch {
      // Sin consecuencia: el próximo registro lo sobrescribe.
    }
    usePushDiagnosticsStore.getState().reset();
  }
}

/**
 * Abre los ajustes de notificaciones de la app (cuando el permiso fue
 * rechazado de forma definitiva, pedirlo otra vez no muestra nada).
 */
export async function openNotificationSettings(): Promise<void> {
  const { Linking } = await import('react-native');
  try {
    if (Platform.OS === 'android' && typeof Linking.sendIntent === 'function') {
      const packageName = Constants.expoConfig?.android?.package;
      if (packageName) {
        await Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [{ key: 'android.provider.extra.APP_PACKAGE', value: packageName }]);
        return;
      }
    }
  } catch (error) {
    logError('openNotificationSettings.intent', error);
  }
  await Linking.openSettings();
}

/**
 * Re-registra el token cuando el sistema lo ROTA (FCM/APNs pueden cambiarlo
 * sin aviso). Devuelve la función para cancelar la suscripción. No lanza.
 */
export async function subscribeToPushTokenRotation(): Promise<() => void> {
  if (!supportsRemotePush) return () => {};
  try {
    const Notifications = await loadNotifications();
    const subscription = Notifications.addPushTokenListener(() => {
      void registerCurrentPushToken();
    });
    return () => subscription.remove();
  } catch (error) {
    logError('subscribeToPushTokenRotation', error);
    return () => {};
  }
}

/** Dispara el push de prueba del backend (solo a los dispositivos de la propia cuenta). */
export async function sendTestPush(): Promise<void> {
  await dispositivosApi.sendTestPush();
}
