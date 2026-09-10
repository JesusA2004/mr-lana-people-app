import { apiClient } from './client';

import type { RegisterPushTokenPayload } from '@/types/device';

/**
 * Registro de push token por dispositivo.
 *
 * `POST/DELETE /api/v1/dispositivos/push-token` —
 * `App\Http\Controllers\Api\V1\DispositivoController` (backend móvil v5).
 * Cada llamada se sigue envolviendo en try/catch por quien la use (ver
 * `usePushRegistration`/`pushNotifications.ts`): un fallo de red aquí nunca
 * debe romper login/logout ni mostrarse al usuario.
 */
export const dispositivosApi = {
  async registerPushToken(payload: RegisterPushTokenPayload): Promise<void> {
    await apiClient.post('/dispositivos/push-token', payload);
  },

  async revokePushToken(token: string): Promise<void> {
    await apiClient.delete('/dispositivos/push-token', { data: { token } });
  },
};
