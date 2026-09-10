import { apiClient, extractData } from '../client';

import type { PaginatedResponse } from '@/types/api';
import type { RhDocumento } from '@/types/rh';

export interface RhDocumentosParams {
  estado?: string;
  sucursal_id?: number | string;
  q?: string;
  per_page?: number;
  page?: number;
}

/** `GET/POST /api/v1/rh/documentos[/{id}/ver|aprobar|rechazar]` — bandeja "directa" de documentos, cualquier colaborador. */
export const rhDocumentosApi = {
  async list(params: RhDocumentosParams = {}): Promise<PaginatedResponse<RhDocumento>> {
    const response = await apiClient.get('/rh/documentos', { params });
    return response.data as PaginatedResponse<RhDocumento>;
  },

  async getById(id: number | string): Promise<RhDocumento> {
    const response = await apiClient.get(`/rh/documentos/${id}`);
    return extractData<RhDocumento>(response.data);
  },

  /** Ruta relativa para el visor seguro (streaming, Bearer manual) — ver `SecureDocumentViewer`. */
  verPath(id: number | string): string {
    return `/rh/documentos/${id}/ver`;
  },

  async aprobar(id: number | string, comentario?: string): Promise<void> {
    await apiClient.post(`/rh/documentos/${id}/aprobar`, comentario ? { comentario } : undefined);
  },

  /** `motivo` es obligatorio. */
  async rechazar(id: number | string, motivo: string): Promise<void> {
    await apiClient.post(`/rh/documentos/${id}/rechazar`, { motivo });
  },
};
