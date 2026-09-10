import { apiClient, extractData } from '../client';

import type { DocumentExtraction } from '@/types/documentExtraction';

/**
 * `GET/POST /api/v1/rh/documentos/{documento}/extraccion[...]` — GAP DE
 * BACKEND: no existe todavía en capacitaciones (confirmado contra
 * `routes/api.php`, sin controlador de extracción/OCR). Cliente
 * implementado completo contra el contrato acordado (AGENTS.md de este
 * encargo, secciones 7-8) — ver `docs/BACKEND_GAPS_FINAL.md`. La app NUNCA
 * hace OCR por su cuenta ni manda documentos a un servicio externo: solo
 * consume el resultado que ya procesó el backend.
 */
export const rhDocumentExtractionApi = {
  async get(documentoId: number | string): Promise<DocumentExtraction> {
    const response = await apiClient.get(`/rh/documentos/${documentoId}/extraccion`);
    return extractData<DocumentExtraction>(response.data);
  },

  /** RH elige explícitamente qué campos aceptar — nunca se aplican todos automáticamente (sección 8). */
  async aplicar(documentoId: number | string, fields: Record<string, string>): Promise<void> {
    await apiClient.post(`/rh/documentos/${documentoId}/extraccion/aplicar`, { fields });
  },

  async ignorar(documentoId: number | string, fields?: string[]): Promise<void> {
    await apiClient.post(`/rh/documentos/${documentoId}/extraccion/ignorar`, fields ? { fields } : undefined);
  },

  async reprocesar(documentoId: number | string): Promise<void> {
    await apiClient.post(`/rh/documentos/${documentoId}/extraccion/reprocesar`);
  },
};
