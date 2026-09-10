import { apiClient, extractData } from '../client';

import type { PaginatedResponse } from '@/types/api';
import type { RhExpediente } from '@/types/rh';

export interface RhExpedientesParams {
  estado?: string;
  empresa_id?: number | string;
  sucursal_id?: number | string;
  departamento_id?: number | string;
  busqueda?: string;
  page?: number;
}

/**
 * `GET/POST /api/v1/rh/expedientes/*` — expedientes completos, dentro del
 * alcance organizacional (`rh.expedientes.*`; `rh_auxiliar` solo lectura).
 * `{documento}` aquí SÍ es el id real de `employee_documents` (no el tipo).
 */
export const rhExpedientesApi = {
  async list(params: RhExpedientesParams = {}): Promise<PaginatedResponse<RhExpediente>> {
    const response = await apiClient.get('/rh/expedientes', { params });
    return response.data as PaginatedResponse<RhExpediente>;
  },

  async getById(colaboradorId: number | string): Promise<RhExpediente> {
    const response = await apiClient.get(`/rh/expedientes/${colaboradorId}`);
    return extractData<RhExpediente>(response.data);
  },

  /** Ruta relativa para el visor seguro (streaming, Bearer manual) — ver `SecureDocumentViewer`. */
  verDocumentoPath(colaboradorId: number | string, documentoId: number | string): string {
    return `/rh/expedientes/${colaboradorId}/documentos/${documentoId}/ver`;
  },

  async aprobarDocumento(colaboradorId: number | string, documentoId: number | string, comentario?: string): Promise<void> {
    await apiClient.post(`/rh/expedientes/${colaboradorId}/documentos/${documentoId}/aprobar`, comentario ? { comentario } : undefined);
  },

  /** `motivo` es obligatorio. */
  async rechazarDocumento(colaboradorId: number | string, documentoId: number | string, motivo: string): Promise<void> {
    await apiClient.post(`/rh/expedientes/${colaboradorId}/documentos/${documentoId}/rechazar`, { motivo });
  },

  async autorizarCambioDocumento(colaboradorId: number | string, documentoId: number | string): Promise<void> {
    await apiClient.post(`/rh/expedientes/${colaboradorId}/documentos/${documentoId}/autorizar-cambio`);
  },

  /** 422 si falta algún documento obligatorio por aprobar; si todos están aprobados, activa al colaborador. */
  async aprobarIncorporacion(colaboradorId: number | string): Promise<void> {
    await apiClient.post(`/rh/expedientes/${colaboradorId}/aprobar-incorporacion`);
  },

  /** `motivo` es obligatorio. No activa al colaborador. */
  async rechazarIncorporacion(colaboradorId: number | string, motivo: string): Promise<void> {
    await apiClient.post(`/rh/expedientes/${colaboradorId}/rechazar-incorporacion`, { motivo });
  },
};
