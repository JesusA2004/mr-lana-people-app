import { apiClient } from './client';

/**
 * Registro de push token por dispositivo.
 *
 * IMPORTANTE: estos endpoints NO existen todavía en el backend (verificado
 * contra routes/api.php de JesusA2004/capacitaciones) — están documentados
 * como requerimiento en docs/MOBILE_BACKEND_REQUIREMENTS.md (P0). Se dejan
 * implementados aquí porque el flujo cliente (permiso → token → registrar)
 * sí debe existir y probarse, pero cada llamada se envuelve en try/catch por
 * quien la use: un 404 de estos endpoints nunca debe romper login/logout ni
 * mostrarse al usuario. Cuando el backend agregue las rutas, este archivo no
 * necesita cambios, solo confirmar el contrato exacto.
 */
export interface RegisterPushTokenPayload {
  token: string;
  platform: 'ios' | 'android' | 'web';
  device_name?: string;
}

export const dispositivosApi = {
  async registerPushToken(payload: RegisterPushTokenPayload): Promise<void> {
    await apiClient.post('/dispositivos/push-token', payload);
  },

  async revokePushToken(token: string): Promise<void> {
    await apiClient.delete('/dispositivos/push-token', { data: { token } });
  },
};
