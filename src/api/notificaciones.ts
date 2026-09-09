import { apiClient, extractData } from './client';

import type { NotificationItem } from '@/types/notification';

export const notificacionesApi = {
  async getAll(): Promise<NotificationItem[]> {
    const response = await apiClient.get('/notificaciones');
    return extractData<NotificationItem[]>(response.data);
  },

  async markAsRead(id: number | string): Promise<NotificationItem | null> {
    const response = await apiClient.post(`/notificaciones/${id}/leer`);
    if (!response.data) return null;
    return extractData<NotificationItem>(response.data);
  },

  /**
   * `POST /api/v1/notificaciones/leer-todas` — endpoint sugerido, todavía
   * NO existe en capacitaciones (ver docs/BACKEND_REQUIREMENTS_V4.md). Se
   * deja implementado del lado de la app para que "Marcar todas como
   * leídas" funcione en cuanto el backend lo agregue; hasta entonces
   * responde 404 y quien la use debe manejarlo sin romper la UI (ver
   * `useMarkAllNotificacionesLeidas`).
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.post('/notificaciones/leer-todas');
  },
};
