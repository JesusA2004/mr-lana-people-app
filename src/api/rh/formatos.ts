import { apiClient, extractData } from '../client';

import type { PaginatedResponse } from '@/types/api';
import type { FormatoOutput, FormatoPreparation, FormatoTipo, GeneratedDocument, RhFormato } from '@/types/formato';

export interface RhFormatosParams {
  tipo?: FormatoTipo;
  q?: string;
  page?: number;
}

export interface GenerarFormatoPayload {
  colaborador_id: number | string;
  overrides?: Record<string, string>;
  output?: FormatoOutput;
}

/**
 * `GET/POST /api/v1/rh/formatos[...]` — GAP DE BACKEND: no existe todavía
 * en capacitaciones (confirmado contra `routes/api.php`, sin controlador de
 * "formatos"). Cliente implementado completo contra el contrato acordado
 * (AGENTS.md de este encargo, secciones 13-18) para que quede listo en
 * automático el día que el backend lo despliegue — ver
 * `docs/BACKEND_GAPS_FINAL.md`. Hasta entonces toda llamada aquí responde
 * 404 y la UI lo maneja como un estado "módulo aún no disponible", nunca
 * como un crash.
 */
export const rhFormatosApi = {
  async list(params: RhFormatosParams = {}): Promise<PaginatedResponse<RhFormato>> {
    const response = await apiClient.get('/rh/formatos', { params });
    return response.data as PaginatedResponse<RhFormato>;
  },

  /** Valores prellenados desde el expediente del colaborador — nunca se guardan de vuelta en el perfil (sección 44). */
  async preparar(formatoId: number | string, colaboradorId: number | string): Promise<FormatoPreparation> {
    const response = await apiClient.get(`/rh/formatos/${formatoId}/preparar`, { params: { colaborador_id: colaboradorId } });
    return extractData<FormatoPreparation>(response.data);
  },

  async generar(formatoId: number | string, payload: GenerarFormatoPayload): Promise<GeneratedDocument> {
    const response = await apiClient.post(`/rh/formatos/${formatoId}/generar`, payload);
    return extractData<GeneratedDocument>(response.data);
  },

  /** Visor seguro autenticado (Bearer) — ver `SecureDocumentViewer`, nunca exponer esta URL fuera de la app. */
  previewPath(documentoGeneradoId: number | string): string {
    return `/rh/formatos/generados/${documentoGeneradoId}/preview`;
  },

  /** Descarga autenticada — solo se ofrece en UI cuando `acciones_permitidas` incluye `"download"`. */
  descargarPath(documentoGeneradoId: number | string): string {
    return `/rh/formatos/generados/${documentoGeneradoId}/descargar`;
  },
};
