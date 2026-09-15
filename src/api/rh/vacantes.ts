import { apiClient } from '../client';

import type { PaginatedResponse } from '@/types/api';
import type { RhVacante } from '@/types/rhVacante';

export interface RhVacantesParams {
  estado?: string;
  sucursal_id?: number | string;
  page?: number;
  per_page?: number;
}

/**
 * `GET /api/v1/rh/vacantes` — SOLO LECTURA
 * (`App\Http\Controllers\Api\V1\Rh\VacanteController`, permiso
 * `vacantes.ver`). Crear/editar/cubrir/cancelar una vacante sigue siendo
 * exclusivo del Portal RH web: este módulo no tiene (ni debe tener)
 * mutaciones.
 */
export const rhVacantesApi = {
  async list(params: RhVacantesParams = {}): Promise<PaginatedResponse<RhVacante>> {
    const response = await apiClient.get('/rh/vacantes', { params });
    return response.data as PaginatedResponse<RhVacante>;
  },
};
