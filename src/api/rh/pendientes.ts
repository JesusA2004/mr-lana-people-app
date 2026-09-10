import { apiClient } from '../client';

import type { RhPendienteFiltro, RhPendientesResponse } from '@/types/rh';

export interface RhPendientesParams {
  tipo?: RhPendienteFiltro;
  q?: string;
  page?: number;
  per_page?: number;
  sucursal_id?: number | string;
  departamento_id?: number | string;
}

/** `GET /api/v1/rh/pendientes` — permiso `rh.pendientes.ver`, bandeja unificada. */
export const rhPendientesApi = {
  async list(params: RhPendientesParams = {}): Promise<RhPendientesResponse> {
    const response = await apiClient.get('/rh/pendientes', { params });
    return response.data as RhPendientesResponse;
  },
};
