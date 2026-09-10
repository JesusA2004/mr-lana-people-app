import { apiClient } from './client';

import type { PaginatedResponse } from '@/types/api';
import type { LaborDocument, LaborDocumentType } from '@/types/laborDocument';

export interface DocumentosLaboralesParams {
  tipo?: LaborDocumentType;
  anio?: number;
  page?: number;
}

/**
 * `GET /api/v1/colaborador/documentos-laborales[...]` — GAP DE BACKEND: no
 * existe todavía en capacitaciones (confirmado contra `routes/api.php`, sin
 * controlador de "documentos laborales" — distinto del expediente, que es
 * lo que el colaborador ENTREGA a RH; esto es lo que la EMPRESA le entrega
 * a él: contrato, recibos de nómina, constancias). Cliente implementado
 * completo contra el contrato acordado (AGENTS.md de este encargo,
 * secciones 19-22) — ver `docs/BACKEND_GAPS_FINAL.md`.
 */
export const documentosLaboralesApi = {
  async list(params: DocumentosLaboralesParams = {}): Promise<PaginatedResponse<LaborDocument>> {
    const response = await apiClient.get('/colaborador/documentos-laborales', { params });
    return response.data as PaginatedResponse<LaborDocument>;
  },

  /** Visor seguro autenticado (Bearer) — solo el documento propio, ver `SecureDocumentViewer`. */
  verPath(id: number | string): string {
    return `/colaborador/documentos-laborales/${id}/ver`;
  },

  /** Descarga autenticada — solo se ofrece en UI cuando `puede_descargar` es `true`. */
  descargarPath(id: number | string): string {
    return `/colaborador/documentos-laborales/${id}/descargar`;
  },

  /** Opcional (sección 67): si el backend no implementa esta ruta, el `catch` de quien la llama simplemente no actualiza ningún contador — nunca se inventa una autoridad local. */
  async marcarVisto(id: number | string): Promise<void> {
    await apiClient.post(`/colaborador/documentos-laborales/${id}/visto`);
  },
};
