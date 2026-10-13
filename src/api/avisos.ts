import { apiClient } from './client';

import type { PaginatedResponse } from '@/types/api';
import type { AvisoItem } from '@/types/aviso';

/**
 * Avisos de RH para el colaborador (mensaje + imagen, a toda la empresa o
 * a él). Solo lectura: enviarlos sigue siendo exclusivo del Portal RH web
 * (`App\Http\Controllers\Rh\AvisoController`).
 */
export const avisosApi = {
  /** `GET /avisos` — `App\Http\Controllers\Api\V1\AvisoController::index`. */
  async getPage(page: number, perPage = 20): Promise<PaginatedResponse<AvisoItem>> {
    const response = await apiClient.get('/avisos', { params: { page, per_page: perPage } });
    return response.data as PaginatedResponse<AvisoItem>;
  },

  /** `GET /avisos/{id}` — un aviso concreto (el push abre este, no la bandeja). */
  async getOne(id: number | string): Promise<AvisoItem> {
    const response = await apiClient.get(`/avisos/${id}`);
    return (response.data as { data: AvisoItem }).data;
  },

  /** Ruta (relativa a la API) del adjunto, imagen o PDF — siempre con Bearer. */
  archivoPath(id: number | string): string {
    return `/avisos/${id}/archivo`;
  },

  /** `POST /avisos/{id}/leido` — se llama al abrir el aviso, nunca antes. */
  async marcarLeido(id: number | string): Promise<void> {
    await apiClient.post(`/avisos/${id}/leido`);
  },
};
