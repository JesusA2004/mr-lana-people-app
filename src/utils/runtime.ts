import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

/**
 * Detección robusta de Expo Go. `Constants.appOwnership` está deprecado y
 * no es confiable en Expo Go bajo SDK 57 (puede no valer `'expo'`) — por
 * eso se usa el mismo helper nativo que usa internamente `expo-notifications`
 * (`isRunningInExpoGo`, de `expo`), no una comparación de string.
 */
export const isExpoGo = isRunningInExpoGo();

/**
 * Push remoto (expo-notifications) solo funciona en Development Build o
 * app standalone — Expo Go lo removió desde el SDK 53, y web no soporta el
 * mismo flujo de permisos/token. Toda la app debe usar esta única
 * condición en vez de repetir la comparación en cada archivo.
 */
export const supportsRemotePush = Platform.OS !== 'web' && !isExpoGo;
