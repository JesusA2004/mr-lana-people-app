import { apiClient, extractData } from '../client';
import { normalizarRhDocumento } from '../normalizers/rhExpediente';

import type { PaginatedResponse } from '@/types/api';
import type { RhDocumento } from '@/types/rh';

export interface RhDocumentosParams {
  estado?: string;
  sucursal_id?: number | string;
  q?: string;
  per_page?: number;
  page?: number;
}

/** `GET/POST /api/v1/rh/documentos[/{id}/ver|descargar|aprobar|rechazar|correccion]` — bandeja "directa" de documentos, cualquier colaborador. */
export const rhDocumentosApi = {
  async list(params: RhDocumentosParams = {}): Promise<PaginatedResponse<RhDocumento>> {
    const response = await apiClient.get('/rh/documentos', { params });
    return response.data as PaginatedResponse<RhDocumento>;
  },

  async getById(id: number | string): Promise<RhDocumento> {
    const response = await apiClient.get(`/rh/documentos/${id}`);
    return normalizarRhDocumento(extractData<unknown>(response.data));
  },

  /** Ruta relativa para REVISAR el archivo (streaming, Bearer manual): se abre en el lector del teléfono. */
  verPath(id: number | string): string {
    return `/rh/documentos/${id}/ver`;
  },

  /** Ruta relativa para guardar una copia (solo si `puede_descargar`; el backend vuelve a autorizar). */
  descargarPath(id: number | string): string {
    return `/rh/documentos/${id}/descargar`;
  },

  async aprobar(id: number | string, comentario?: string): Promise<void> {
    await apiClient.post(`/rh/documentos/${id}/aprobar`, comentario ? { comentario } : undefined);
  },

  /** `motivo` es obligatorio. */
  async rechazar(id: number | string, motivo: string): Promise<void> {
    await apiClient.post(`/rh/documentos/${id}/rechazar`, { motivo });
  },

  /** «Pedir corrección» (`motivo` obligatorio): el colaborador vuelve a subirlo. */
  async pedirCorreccion(id: number | string, motivo: string): Promise<void> {
    await apiClient.post(`/rh/documentos/${id}/correccion`, { motivo });
  },
};
