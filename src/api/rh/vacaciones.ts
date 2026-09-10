import { apiClient, extractData } from '../client';

import type { PaginatedResponse } from '@/types/api';
import type { RhVacacion } from '@/types/rh';

export interface RhVacacionesParams {
  estado?: string;
  sucursal_id?: number | string;
  empresa_id?: number | string;
  q?: string;
  page?: number;
}

/** `GET/POST /api/v1/rh/vacaciones[/{id}/aprobar|rechazar]`. */
export const rhVacacionesApi = {
  async list(params: RhVacacionesParams = {}): Promise<PaginatedResponse<RhVacacion>> {
    const response = await apiClient.get('/rh/vacaciones', { params });
    return response.data as PaginatedResponse<RhVacacion>;
  },

  async getById(id: number | string): Promise<RhVacacion> {
    const response = await apiClient.get(`/rh/vacaciones/${id}`);
    return extractData<RhVacacion>(response.data);
  },

  async aprobar(id: number | string): Promise<void> {
    await apiClient.post(`/rh/vacaciones/${id}/aprobar`);
  },

  /** `motivo` es obligatorio. */
  async rechazar(id: number | string, motivo: string): Promise<void> {
    await apiClient.post(`/rh/vacaciones/${id}/rechazar`, { motivo });
  },
};
