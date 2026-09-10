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

  /** `POST /api/v1/notificaciones/leer-todas` — `App\Http\Controllers\Api\V1\NotificacionController::marcarTodasLeidas`. */
  async markAllAsRead(): Promise<void> {
    await apiClient.post('/notificaciones/leer-todas');
  },
};
