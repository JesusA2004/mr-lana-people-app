import { apiClient, extractData } from './client';
import {
  normalizeCapitulos,
  normalizeCapitulosInduccion,
  normalizeContenidoEvaluacion,
  normalizeEvaluacionInduccion,
  normalizeInduccionResumen,
  normalizeMiniOrganigrama,
} from './normalizers/induccion';

import type {
  CapituloInduccion,
  CapitulosInduccion,
  ContenidoEvaluacionInduccion,
  EvaluacionInduccion,
  InduccionResumen,
  MiniOrganigramaNodo,
  OpinionInduccion,
  RespuestasInduccion,
} from '@/types/induccion';
import { asRecord } from '@/utils/normalize';

/**
 * Inducción Mr. Lana — `App\Http\Controllers\Api\V1\MiProcesoController`.
 * El progreso se guarda SIEMPRE en el servidor (nunca solo local): así se
 * retoma donde se quedó en cualquier dispositivo y en la web.
 */
export const induccionApi = {
  /** Capítulos del avance PROPIO (el backend valida que sea del colaborador). */
  async capitulos(avanceId: number): Promise<CapitulosInduccion> {
    const response = await apiClient.get(`/colaborador/induccion/capitulos/${avanceId}`);
    return normalizeCapitulosInduccion(extractData<unknown>(response.data));
  },

  /** Registra un capítulo visto; devuelve el resumen actualizado del servidor. */
  async registrarProgreso(avanceId: number, capitulo: string): Promise<InduccionResumen | null> {
    const response = await apiClient.post(`/colaborador/induccion/capitulos/${avanceId}/progreso`, { capitulo });
    return normalizeInduccionResumen(extractData<unknown>(response.data));
  },

  /** Mini-organigrama vigente del capítulo 4 (corporativo/comercial/sucursal). */
  async organigrama(vista: string): Promise<MiniOrganigramaNodo | null> {
    const response = await apiClient.get(`/colaborador/induccion/organigrama/${encodeURIComponent(vista)}`);
    return normalizeMiniOrganigrama(extractData<unknown>(response.data));
  },

  /** Modo presentación (colaborador o RH): mismos capítulos, sin progreso. */
  async presentacion(): Promise<{ titulo: string; capitulos: CapituloInduccion[] }> {
    const response = await apiClient.get('/induccion/presentacion');
    const raw = asRecord(extractData<unknown>(response.data));
    return { titulo: typeof raw.titulo === 'string' ? raw.titulo : 'Inducción Mr. Lana', capitulos: normalizeCapitulos(raw.capitulos) };
  },

  /** Preguntas públicas de la evaluación (sin clave de respuestas ni rúbrica). */
  async contenidoEvaluacion(): Promise<ContenidoEvaluacionInduccion> {
    const response = await apiClient.get('/colaborador/induccion');
    return normalizeContenidoEvaluacion(extractData<unknown>(response.data));
  },

  /** Presenta la evaluación; A/B/C se califican en el servidor y D lo califica RH. */
  async presentar(evaluacionId: number, respuestas: RespuestasInduccion, opinion: OpinionInduccion | null): Promise<EvaluacionInduccion | null> {
    const response = await apiClient.post(`/colaborador/induccion/${evaluacionId}/presentar`, { respuestas, opinion });
    return normalizeEvaluacionInduccion(asRecord(extractData<unknown>(response.data)).evaluacionInduccion);
  },
};
