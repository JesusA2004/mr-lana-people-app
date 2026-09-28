import { apiClient, extractData } from './client';

import type { PaginatedResponse } from '@/types/api';
import type { AbrirNotificacionRespuesta, NotificationItem } from '@/types/notification';

export const notificacionesApi = {
  /** `GET /notificaciones` — paginado de verdad (antes solo las 30 más recientes, sin forma de ver historial más viejo). */
  async getPage(page: number, perPage = 30): Promise<PaginatedResponse<NotificationItem>> {
    const response = await apiClient.get('/notificaciones', { params: { page, per_page: perPage } });
    return response.data as PaginatedResponse<NotificationItem>;
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
