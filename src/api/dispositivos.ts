import { apiClient } from './client';

import type { RegisterPushTokenPayload } from '@/types/device';

/**
 * Registro de push token por dispositivo.
 *
 * `POST/DELETE /api/v1/dispositivos/push-token` — confirmado que NO existen
 * en `routes/api.php` de capacitaciones (auditoría 2026-09-09: solo hay
 * rutas para auth, colaborador, vacaciones, solicitudes, notificaciones,
 * incorporación y expedientes de RH; nada bajo `dispositivos`). Se dejan
 * implementados aquí porque el flujo cliente (permiso → token → registrar)
 * debe existir y probarse ya; cada llamada se envuelve en try/catch por
 * quien la use (ver `usePushRegistration`/`pushNotifications.ts`) — un 404
 * de estos endpoints nunca debe romper login/logout ni mostrarse al
 * usuario.
 */
export const dispositivosApi = {
  async registerPushToken(payload: RegisterPushTokenPayload): Promise<void> {
    await apiClient.post('/dispositivos/push-token', payload);
  },

  async revokePushToken(token: string): Promise<void> {
    await apiClient.delete('/dispositivos/push-token', { data: { token } });
  },
};
