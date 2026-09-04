import { useEffect } from 'react';

import { registerCurrentPushToken } from '@/services/pushNotifications';

/**
 * Dispara el registro de push al iniciar sesión (ver
 * `src/services/pushNotifications.ts` para toda la lógica real). Este hook
 * NO importa `expo-notifications` — ni directa ni transitivamente — para
 * que cargar la app en Expo Go nunca dependa de ese módulo.
 */
export function usePushRegistration(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    void registerCurrentPushToken();
  }, [enabled]);
}
