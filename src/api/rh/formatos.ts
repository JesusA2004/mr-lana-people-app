import { apiClient, extractData } from '../client';

import type { FormatoOutput, FormatoPreparation, GeneratedDocument, RhFormato } from '@/types/formato';
import { normalizeRhFormatosList } from '@/utils/formato';

export interface GenerarFormatoPayload {
  colaborador_id: number | string;
  overrides?: Record<string, string>;
  output?: FormatoOutput;
}

/**
 * `GET /api/v1/rh/formatos` — espejo EXACTO de
 * `App\Http\Controllers\Api\V1\Rh\FormatoController` en capacitaciones
 * (confirmado contra el código fuente real, commit `34a8132`). YA
 * IMPLEMENTADO: catálogo (sin filtros de query — `index()` no lee ningún
 * parámetro, nunca mandar `tipo`/`q`/`page` al backend) + descarga
 * DOCX/PDF de documentos ya generados. Generar/preparar/preview un
 * documento NUEVO desde el celular sigue sin existir — ver el bloque
 * "contrato propuesto" al final de este archivo y
 * `docs/BACKEND_GAPS_FINAL.md`.
 */
export const rhFormatosApi = {
  async list(): Promise<RhFormato[]> {
    const response = await apiClient.get('/rh/formatos');
    return normalizeRhFormatosList((response.data as { data?: unknown } | undefined)?.data);
  },

  /**
   * Ambas rutas reciben directamente el id de un `GeneratedDocument` ya
   * existente (`{documento}` en `routes/api.php`), NO el id del formato —
   * bug corregido: la auditoría anterior usaba un prefijo `formatos/
   * generados/{id}/...` que nunca existió. GAP real: no hay endpoint para
   * DESCUBRIR esos ids desde el celular (ver docs/BACKEND_GAPS_FINAL.md) —
   * estas rutas solo son útiles el día que exista una lista de documentos
   * generados por colaborador.
   */
  descargarPath(documentoGeneradoId: number | string): string {
    return `/rh/formatos/${documentoGeneradoId}/descargar`;
  },

  descargarPdfPath(documentoGeneradoId: number | string): string {
    return `/rh/formatos/${documentoGeneradoId}/descargar-pdf`;
  },

  // -------------------------------------------------------------------------
  // Contrato PROPUESTO, AÚN NO IMPLEMENTADO en el backend real — mantenido
  // para que `rh/formatos/generar.tsx` compile y quede listo, pero sin
  // ningún punto de entrada alcanzable desde la navegación normal de la
  // app (ver docs/BACKEND_GAPS_FINAL.md). Toda llamada aquí responde 404
  // hoy.
  // -------------------------------------------------------------------------

  async preparar(formatoId: number | string, colaboradorId: number | string): Promise<FormatoPreparation> {
    const response = await apiClient.get(`/rh/formatos/${formatoId}/preparar`, { params: { colaborador_id: colaboradorId } });
    return extractData<FormatoPreparation>(response.data);
  },

  async generar(formatoId: number | string, payload: GenerarFormatoPayload): Promise<GeneratedDocument> {
    const response = await apiClient.post(`/rh/formatos/${formatoId}/generar`, payload);
    return extractData<GeneratedDocument>(response.data);
  },

  previewPath(documentoGeneradoId: number | string): string {
    return `/rh/formatos/generados/${documentoGeneradoId}/preview`;
  },
};
