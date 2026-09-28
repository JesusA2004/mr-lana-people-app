import { apiClient, extractData } from '../client';

import type { PaginatedResponse } from '@/types/api';
import type {
  GenerarFormatoOficialPayload,
  OfficialFormatGeneracion,
  OfficialFormatItem,
  OfficialFormatPreparacion,
  OfficialFormatVersionResumen,
} from '@/types/formatoOficial';

export interface RhFormatosOficialesParams {
  tipo?: string;
  /** Búsqueda por nombre — se manda al backend (`FormatoOficialController::index`), nunca solo local. */
  q?: string;
  archivados?: boolean;
  aplica_a?: 'colaborador' | 'candidato' | 'ambos';
}

export interface RhFormatosOficialesGeneradosParams {
  formato_id?: number | string;
  colaborador_id?: number | string;
  page?: number;
  per_page?: number;
}

export interface OfficialFormatDetail extends OfficialFormatItem {
  versiones: OfficialFormatVersionResumen[];
}

/** `GET /rh/formatos-oficiales/variables` — informativo, agrupado por el propio backend; se lee tal cual, sin tipar cada clave. */
export interface OfficialFormatVariablesCatalogo {
  data: unknown;
  formatos: string[];
}

export interface PrepararFormatoOficialPayload {
  tipo_sujeto: 'colaborador' | 'candidato';
  sujeto_id: number;
  manuales?: Record<string, string>;
  guardar_en_expediente?: boolean;
}

export interface OfficialFormatVistaPrevia extends OfficialFormatPreparacion {
  pdf_base64: string;
}

/**
 * `App\Http\Controllers\Api\V1\Rh\FormatoOficialController` en
 * `capacitaciones@cc4beeb` — sistema real de PDF fijo + overlay de datos,
 * DISTINTO del motor DOCX legacy (`src/api/rh/formatos.ts`). RH móvil es
 * solo CONSUMIDOR: navega el catálogo, prepara/genera para un
 * colaborador/candidato y ve/descarga el resultado. Administrar plantillas
 * (subir PDF, mapear coordenadas, versionar/publicar) se queda en el Portal
 * RH web — mismo criterio que Vacantes.
 */
export const rhFormatosOficialesApi = {
  /** `GET /rh/formatos-oficiales` — arreglo plano, SIN paginar. */
  async list(params: RhFormatosOficialesParams = {}): Promise<OfficialFormatItem[]> {
    const response = await apiClient.get('/rh/formatos-oficiales', { params });
    return extractData<OfficialFormatItem[]>(response.data);
  },

  /** `GET /rh/formatos-oficiales/variables` — catálogo informativo de variables disponibles + formatos de salida soportados. */
  async variables(): Promise<OfficialFormatVariablesCatalogo> {
    const response = await apiClient.get('/rh/formatos-oficiales/variables');
    return response.data as OfficialFormatVariablesCatalogo;
  },

  async getById(id: number | string): Promise<OfficialFormatDetail> {
    const response = await apiClient.get(`/rh/formatos-oficiales/${id}`);
    return extractData<OfficialFormatDetail>(response.data);
  },

  /** Averigua qué falta (`faltantes`/`manuales`) ANTES de generar — nunca se salta este paso. */
  async preparar(id: number | string, payload: PrepararFormatoOficialPayload): Promise<OfficialFormatPreparacion> {
    const response = await apiClient.post(`/rh/formatos-oficiales/${id}/preparar`, payload);
    return extractData<OfficialFormatPreparacion>(response.data);
  },

  /** Mismo cuerpo que `preparar`, además regresa `pdf_base64` con la vista previa ya rellenada. */
  async vistaPrevia(id: number | string, payload: PrepararFormatoOficialPayload): Promise<OfficialFormatVistaPrevia> {
    const response = await apiClient.post(`/rh/formatos-oficiales/${id}/vista-previa`, payload);
    return extractData<OfficialFormatVistaPrevia>(response.data);
  },

  async generar(id: number | string, payload: GenerarFormatoOficialPayload): Promise<OfficialFormatGeneracion> {
    const response = await apiClient.post(`/rh/formatos-oficiales/${id}/generar`, payload);
    return extractData<OfficialFormatGeneracion>(response.data);
  },

  /** `GET /rh/formatos-oficiales/generados` — PAGINADO de verdad (`meta.current_page/last_page/total`). */
  async generados(params: RhFormatosOficialesGeneradosParams = {}): Promise<PaginatedResponse<OfficialFormatGeneracion>> {
    const response = await apiClient.get('/rh/formatos-oficiales/generados', { params });
    return response.data as PaginatedResponse<OfficialFormatGeneracion>;
  },

  /** Streaming autenticado como adjunto (Bearer) — usar con descarga a disco, nunca como URL directa. */
  descargarPath(generacionId: number | string): string {
    return `/rh/formatos-oficiales/generados/${generacionId}/descargar`;
  },

  /** Streaming autenticado inline (Bearer) — usar con `SecureDocumentViewer`. */
  verPath(generacionId: number | string): string {
    return `/rh/formatos-oficiales/generados/${generacionId}/ver`;
  },
};
