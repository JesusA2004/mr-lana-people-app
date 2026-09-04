import { apiClient } from './client';

import type { RegisterPushTokenPayload } from '@/types/device';

/**
 * Registro de push token por dispositivo.
 *
 * `POST/DELETE /api/v1/dispositivos/push-token` — pendientes en backend
 * (ver docs/MOBILE_BACKEND_REQUIREMENTS.md P0.7, incluye tabla sugerida y
 * Service de envío). Se implementan aquí porque el flujo cliente (permiso →
 * token → registrar) debe existir y probarse ya; cada llamada se envuelve
 * en try/catch por quien la use (ver `usePushRegistration`) — un 404 de
 * estos endpoints nunca debe romper login/logout ni mostrarse al usuario.
 */
export const dispositivosApi = {
  async registerPushToken(payload: RegisterPushTokenPayload): Promise<void> {
    await apiClient.post('/dispositivos/push-token', payload);
  },

  async revokePushToken(token: string): Promise<void> {
    await apiClient.delete('/dispositivos/push-token', { data: { token } });
  },
};
