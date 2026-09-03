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
};
