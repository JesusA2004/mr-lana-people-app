import { apiClient, extractData } from '../client';

import type { PaginatedResponse } from '@/types/api';
import type { RhIncorporacion } from '@/types/rh';

export interface RhIncorporacionesParams {
  estado?: string;
  q?: string;
  page?: number;
  per_page?: number;
}

/** `GET/POST /api/v1/rh/incorporaciones[/{colaborador}/aprobar|rechazar]`. */
export const rhIncorporacionesApi = {
  async list(params: RhIncorporacionesParams = {}): Promise<PaginatedResponse<RhIncorporacion>> {
    const response = await apiClient.get('/rh/incorporaciones', { params });
    return response.data as PaginatedResponse<RhIncorporacion>;
  },

  async getById(colaboradorId: number | string): Promise<RhIncorporacion> {
    const response = await apiClient.get(`/rh/incorporaciones/${colaboradorId}`);
    return extractData<RhIncorporacion>(response.data);
  },

  /** 422 si falta algún documento obligatorio por aprobar (misma regla que `rh/expedientes/{colaborador}/aprobar-incorporacion`). */
  async aprobar(colaboradorId: number | string): Promise<void> {
    await apiClient.post(`/rh/incorporaciones/${colaboradorId}/aprobar`);
  },

  /** `motivo` es obligatorio. No activa al colaborador. */
  async rechazar(colaboradorId: number | string, motivo: string): Promise<void> {
    await apiClient.post(`/rh/incorporaciones/${colaboradorId}/rechazar`, { motivo });
  },
};
