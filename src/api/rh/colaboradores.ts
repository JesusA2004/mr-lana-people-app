import { apiClient, extractData } from '../client';
import { normalizeRhColaborador, normalizeRhPagina } from '../normalizers/rhFotos';

import type { PaginatedResponse } from '@/types/api';
import type { RhColaborador } from '@/types/rh';

export interface RhColaboradoresParams {
  q?: string;
  sucursal_id?: number | string;
  departamento_id?: number | string;
  estatus?: string;
  page?: number;
  per_page?: number;
}

/** `GET /api/v1/rh/colaboradores[/{id}]` — datos básicos + contadores, nunca el expediente completo (ver `rhExpedientesApi`). */
export const rhColaboradoresApi = {
  async list(params: RhColaboradoresParams = {}): Promise<PaginatedResponse<RhColaborador>> {
    const response = await apiClient.get('/rh/colaboradores', { params });
    return normalizeRhPagina(response.data, normalizeRhColaborador);
  },

  async getById(id: number | string): Promise<RhColaborador> {
    const response = await apiClient.get(`/rh/colaboradores/${id}`);
    return normalizeRhColaborador(extractData<unknown>(response.data));
  },
};
