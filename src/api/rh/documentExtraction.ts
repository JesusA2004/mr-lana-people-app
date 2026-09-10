import { apiClient } from '../client';

import type { DocumentExtractionResponse, ExtractionApplicableField } from '@/types/documentExtraction';
import { normalizeDocumentExtractionResponse } from '@/utils/documentExtraction';

/**
 * `GET/POST /api/v1/rh/documentos/{documento}/extraccion[...]` — espejo
 * EXACTO de `App\Http\Controllers\Api\V1\Rh\DocumentoController` en
 * capacitaciones (confirmado contra el código fuente real, commit
 * `34a8132`). YA IMPLEMENTADO en el backend — la auditoría anterior lo daba
 * como gap completo con un contrato distinto (`fields` en vez de
 * `valores`, `differences` como arreglo con `label`, `acciones_permitidas`
 * en el recurso, `reprocesar` como acción móvil); todo eso era incorrecto y
 * quedó corregido aquí. La app NUNCA hace OCR por su cuenta ni manda
 * documentos a un servicio externo: solo consume el resultado que ya
 * procesó el backend.
 */
export const rhDocumentExtractionApi = {
  async get(documentoId: number | string): Promise<DocumentExtractionResponse> {
    const response = await apiClient.get(`/rh/documentos/${documentoId}/extraccion`);
    return normalizeDocumentExtractionResponse((response.data as { data?: unknown } | undefined)?.data);
  },

  /**
   * Backend real valida `{ valores: { curp?, rfc?, nss?, fecha_nacimiento? } }`
   * — bug corregido: la app mandaba `{ fields }`, el backend siempre
   * respondía 422 (`valores` es `required`). RH elige explícitamente qué
   * campos aceptar — nunca se aplican todos automáticamente.
   */
  async aplicar(documentoId: number | string, valores: Partial<Record<ExtractionApplicableField, string>>): Promise<void> {
    await apiClient.post(`/rh/documentos/${documentoId}/extraccion/aplicar`, { valores });
  },

  /** `ignorarExtraccion` no valida ni lee ningún campo del body — nunca mandar `fields` (bug corregido: la app mandaba un body que el backend ignora, inofensivo pero incorrecto). */
  async ignorar(documentoId: number | string): Promise<void> {
    await apiClient.post(`/rh/documentos/${documentoId}/extraccion/ignorar`);
  },

  // NO existe `reprocesar` en la API móvil real (confirmado contra
  // `routes/api.php` y documentado explícitamente en
  // `docs/DOCUMENT_EXTRACTION.md`: "Reprocesar solo está disponible en el
  // panel web por ahora"). No se declara ningún método aquí para esa
  // acción — ver `docs/BACKEND_GAPS_FINAL.md`.
};
