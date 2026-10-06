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

  /** `POST /avisos/{id}/leido` — se llama al abrir el aviso, nunca antes. */
  async marcarLeido(id: number | string): Promise<void> {
    await apiClient.post(`/avisos/${id}/leido`);
  },
};
