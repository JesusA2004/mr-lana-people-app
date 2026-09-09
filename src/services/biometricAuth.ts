import * as LocalAuthentication from 'expo-local-authentication';

import { logError } from '@/utils/errors';

export type BiometricKind = 'fingerprint' | 'facial' | 'iris' | 'generic';

export interface BiometricCapability {
  /** El dispositivo tiene sensor biométrico. */
  hasHardware: boolean;
  /** El usuario ya registró al menos una huella/rostro en el sistema operativo. */
  isEnrolled: boolean;
  /** El tipo más específico disponible, para mostrar la etiqueta correcta en UI ("Huella", "Face ID"...). */
  primaryType: BiometricKind | null;
}

/**
 * `expo-local-authentication` funciona en Expo Go (a diferencia de
 * expo-notifications, no tiene el bug de crash documentado en
 * `pushNotifications.ts`) — se importa estático a propósito, sin el
 * patrón de import dinámico que sí necesita push.
 */
export async function getBiometricCapabilityAsync(): Promise<BiometricCapability> {
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    const primaryType: BiometricKind | null = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
      ? 'facial'
      : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ? 'fingerprint'
        : types.includes(LocalAuthentication.AuthenticationType.IRIS)
          ? 'iris'
          : types.length > 0
            ? 'generic'
            : null;

    return { hasHardware, isEnrolled, primaryType };
  } catch (error) {
    logError('getBiometricCapabilityAsync', error);
    return { hasHardware: false, isEnrolled: false, primaryType: null };
  }
}

/** Etiqueta legible del tipo de biometría disponible, para Configuración/LockScreen. */
export function biometricLabel(kind: BiometricKind | null): string {
  switch (kind) {
    case 'facial':
      return 'Reconocimiento facial';
    case 'fingerprint':
      return 'Huella digital';
    case 'iris':
      return 'Reconocimiento de iris';
    case 'generic':
      return 'Biometría';
    default:
      return 'Biometría';
  }
}

export interface BiometricAuthResult {
  success: boolean;
  /** true si el usuario canceló explícitamente (no es un "fallo" real, no debe mostrarse como error). */
  cancelled: boolean;
}

/**
 * Dispara el prompt nativo. Nunca deja al usuario atrapado (V4 sección
 * 118): si falla o se cancela, quien llame debe caer siempre a un método
 * alterno (contraseña) — este helper solo informa el resultado, no bloquea
 * nada por su cuenta.
 */
export async function authenticateWithBiometricsAsync(promptMessage: string): Promise<BiometricAuthResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Usar contraseña',
      disableDeviceFallback: false,
    });

    if (result.success) return { success: true, cancelled: false };

    const cancelled = result.error === 'user_cancel' || result.error === 'app_cancel' || result.error === 'system_cancel';
    return { success: false, cancelled };
  } catch (error) {
    logError('authenticateWithBiometricsAsync', error);
    return { success: false, cancelled: false };
  }
}
