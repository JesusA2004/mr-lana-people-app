import { apiClient, extractData } from '../client';

import type { PaginatedResponse } from '@/types/api';
import type { RhSolicitud } from '@/types/rh';

export interface RhSolicitudesParams {
  estado?: string;
  tipo?: string;
  sucursal_id?: number | string;
  empresa_id?: number | string;
  departamento_id?: number | string;
  q?: string;
  page?: number;
}

/** `GET/POST /api/v1/rh/solicitudes[/{id}/aprobar|rechazar|correccion]`. */
export const rhSolicitudesApi = {
  async list(params: RhSolicitudesParams = {}): Promise<PaginatedResponse<RhSolicitud>> {
    const response = await apiClient.get('/rh/solicitudes', { params });
    return response.data as PaginatedResponse<RhSolicitud>;
  },

  async getById(id: number | string): Promise<RhSolicitud> {
    const response = await apiClient.get(`/rh/solicitudes/${id}`);
    return extractData<RhSolicitud>(response.data);
  },

  async aprobar(id: number | string, comentario?: string): Promise<void> {
    await apiClient.post(`/rh/solicitudes/${id}/aprobar`, comentario ? { comentario } : undefined);
  },

  /** `motivo` es obligatorio — el backend responde 422 sin él. */
  async rechazar(id: number | string, motivo: string): Promise<void> {
    await apiClient.post(`/rh/solicitudes/${id}/rechazar`, { motivo });
  },

  /** `motivo` es obligatorio. */
  async solicitarCorreccion(id: number | string, motivo: string): Promise<void> {
    await apiClient.post(`/rh/solicitudes/${id}/correccion`, { motivo });
  },
};
