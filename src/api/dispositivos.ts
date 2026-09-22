import { apiClient } from './client';

import type { RegisterPushTokenPayload } from '@/types/device';

/**
 * Registro de push token por dispositivo.
 *
 * `POST/DELETE /api/v1/dispositivos/push-token` —
 * `App\Http\Controllers\Api\V1\DispositivoController`. Cada llamada se sigue
 * envolviendo en try/catch por quien la use (`services/pushNotifications.ts`):
 * un fallo de red aquí nunca debe romper login/logout ni mostrarse al usuario.
 */
export const dispositivosApi = {
  async registerPushToken(payload: RegisterPushTokenPayload): Promise<void> {
    await apiClient.post('/dispositivos/push-token', payload);
  },

  async revokePushToken(token: string, options: { timeout?: number } = {}): Promise<void> {
    await apiClient.delete('/dispositivos/push-token', { data: { token }, timeout: options.timeout });
  },

  /**
   * `POST /dispositivos/push-prueba`: el backend envía "Notificación de
   * prueba" (type `push_test`) SOLO a los dispositivos activos de la cuenta
   * autenticada — el cliente nunca manda un token. 403 si el entorno no lo
   * permite, 422 si la cuenta no tiene dispositivos registrados.
   */
  async sendTestPush(): Promise<void> {
    await apiClient.post('/dispositivos/push-prueba');
  },
};
