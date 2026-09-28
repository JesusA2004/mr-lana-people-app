import { apiClient, extractData } from '../client';

import type { FormatoPreparation, GeneratedDocument, RhFormato } from '@/types/formato';
import { normalizeRhFormatosList } from '@/utils/formato';

export interface PrepararGenerarFormatoPayload {
  tipo_sujeto: 'colaborador' | 'candidato';
  sujeto_id: number | string;
  /** Solo las variables manuales declaradas para esa plantilla — el backend rechaza cualquier otra clave. */
  extra?: Record<string, string>;
}

/**
 * `App\Http\Controllers\Api\V1\Rh\FormatoController` — motor de plantillas
 * DOCX (App\Services\Plantillas\*), mismos servicios que el panel web (ver
 * docs/PLANTILLAS_FORMATOS.md). Catálogo, preparar, generar y descarga
 * (DOCX/PDF) — administrar plantillas (subir, mapear variables, versionar)
 * se queda en Portal RH.
 */
export const rhFormatosApi = {
  /** `GET /rh/formatos` — arreglo plano, sin paginación ni filtros de query. */
  async list(): Promise<RhFormato[]> {
    const response = await apiClient.get('/rh/formatos');
    return normalizeRhFormatosList((response.data as { data?: unknown } | undefined)?.data);
  },

  /** `POST /rh/formatos/{plantilla}/preparar` — qué se puede resolver solo, qué falta, y si ya se puede generar. */
  async preparar(plantillaId: number | string, payload: PrepararGenerarFormatoPayload): Promise<FormatoPreparation> {
    const response = await apiClient.post(`/rh/formatos/${plantillaId}/preparar`, payload);
    return extractData<FormatoPreparation>(response.data);
  },

  /** `POST /rh/formatos/{plantilla}/generar` — crea el `GeneratedDocument` y lo archiva en el expediente del colaborador. */
  async generar(plantillaId: number | string, payload: PrepararGenerarFormatoPayload): Promise<GeneratedDocument> {
    const response = await apiClient.post(`/rh/formatos/${plantillaId}/generar`, payload);
    return extractData<GeneratedDocument>(response.data);
  },

  /** Streaming autenticado (Bearer) como adjunto — nunca una URL directa expuesta. */
  descargarPath(documentoGeneradoId: number | string): string {
    return `/rh/formatos/${documentoGeneradoId}/descargar`;
  },

  descargarPdfPath(documentoGeneradoId: number | string): string {
    return `/rh/formatos/${documentoGeneradoId}/descargar-pdf`;
  },

  /**
   * Vista previa embebida del documento ya generado: reutiliza la misma
   * descarga PDF (`SecureDocumentViewer` la descarga a un archivo temporal
   * y la abre en un WebView local — el `Content-Disposition` del backend no
   * afecta ese flujo). No existe un endpoint de "preview" aparte.
   */
  previewPath(documentoGeneradoId: number | string): string {
    return this.descargarPdfPath(documentoGeneradoId);
  },
};
