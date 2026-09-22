import { apiClient, extractData } from './client';
import { normalizeLaborDocument } from './normalizers/laborDocument';

import type { LaborDocument } from '@/types/laborDocument';
import { normalizePaginated, type Paginated } from '@/utils/normalize';

export interface DocumentosLaboralesParams {
  /** Único filtro real del autoservicio: `pendientes_firma`. */
  estado?: 'pendientes_firma';
  page?: number;
}

/**
 * Documentos laborales PROPIOS del colaborador (contratos, comprobantes,
 * recibos internos, documentos de préstamo...) —
 * `App\Http\Controllers\Api\V1\CicloLaboralColaboradorController` en
 * capacitaciones (backend 2026-09-22). El colaborador sale SIEMPRE de la
 * sesión; los recursos por id pasan por `GeneratedDocumentPolicy`.
 *
 * Detalle: `GET /colaborador/documentos-laborales/{id}` (backend
 * 2026-09-22, solo titular; mismo contrato que el listado). Un documento
 * ajeno, cancelado o en borrador responde 404.
 */
export const documentosLaboralesApi = {
  async list(params: DocumentosLaboralesParams = {}): Promise<Paginated<LaborDocument>> {
    const response = await apiClient.get('/colaborador/documentos-laborales', { params });
    return normalizePaginated(response.data, normalizeLaborDocument);
  },

  async detalle(id: number | string, signal?: AbortSignal): Promise<LaborDocument> {
    const response = await apiClient.get(`/colaborador/documentos-laborales/${id}`, { signal });
    return normalizeLaborDocument(extractData<unknown>(response.data));
  },

  /** Streaming autenticado (Bearer) para `SecureDocumentViewer` — nunca una URL pública. */
  descargarPath(id: number | string): string {
    return `/colaborador/documentos-laborales/${id}/descargar`;
  },

  /**
   * Aceptación / firma digital (`acepto=true` es obligatorio en backend,
   * `accepted`). Solo el titular y solo en `pendiente_firma_colaborador`;
   * el backend registra fecha, IP, user agent y hash del PDF aceptado.
   */
  async firmar(id: number | string, comentario?: string | null): Promise<LaborDocument> {
    const response = await apiClient.post(`/colaborador/documentos-laborales/${id}/firmar`, {
      acepto: true,
      ...(comentario ? { comentario } : {}),
    });
    return normalizeLaborDocument(extractData<unknown>(response.data));
  },
};
