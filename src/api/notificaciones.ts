import { apiClient, extractData } from './client';

import type { AbrirNotificacionRespuesta, NotificationItem } from '@/types/notification';

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
   * `POST /api/v1/notificaciones/{id}/abrir` — marca leída Y devuelve el
   * estado ACTUAL del recurso (`DestinoNotificacionService::resolver()`):
   * usarlo al TOCAR una notificación en vez de `markAsRead` (AGENTS.md
   * sección 27), para poder avisar "ya fue atendida" cuando alguien la
   * resolvió desde la web mientras tanto.
   */
  async abrir(id: number | string): Promise<AbrirNotificacionRespuesta> {
    const response = await apiClient.post(`/notificaciones/${id}/abrir`);
    return extractData<AbrirNotificacionRespuesta>(response.data);
  },

  /** `POST /api/v1/notificaciones/leer-todas` — `App\Http\Controllers\Api\V1\NotificacionController::marcarTodasLeidas`. */
  async markAllAsRead(): Promise<void> {
    await apiClient.post('/notificaciones/leer-todas');
  },
};
