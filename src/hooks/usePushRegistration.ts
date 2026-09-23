import { useEffect } from 'react';

import { registerCurrentPushToken, subscribeToPushTokenRotation } from '@/services/pushNotifications';
import { usePushDiagnosticsStore } from '@/store/pushDiagnosticsStore';

/**
 * Sincroniza el push token con el backend al entrar a la app con sesión y
 * cada vez que el sistema ROTA el token del dispositivo (FCM/APNs pueden
 * cambiarlo sin aviso: reinstalación de servicios, restauración de backup).
 * El registro es idempotente en backend (updateOrCreate por token), así que
 * sincronizar en cada apertura no crea duplicados.
 *
 * Toda la lógica real vive en `src/services/pushNotifications.ts`;
 * `expo-notifications` solo se importa dinámicamente y fuera de Expo Go.
 */
export function usePushRegistration(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;

    void usePushDiagnosticsStore.getState().loadPersisted();
    void registerCurrentPushToken();

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void subscribeToPushTokenRotation().then((stop) => {
      if (cancelled) stop();
      else unsubscribe = stop;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [enabled]);
}
