import { apiClient, extractData } from './client';
import { normalizeContenidoEvaluacion, normalizeEvaluacionInduccion, normalizeInduccionResumen, normalizeHeartbeatVideoInduccion, normalizeMaterialInduccion, normalizePdfInduccion, normalizeSesionVideoInduccion } from './normalizers/induccion';

import type {
  ContenidoEvaluacionInduccion,
  EvaluacionInduccion,
  HeartbeatVideoInduccion,
  InduccionResumen,
  MaterialInduccion,
  OpinionInduccion,
  PdfInduccion,
  RespuestasInduccion,
  SesionVideoInduccion,
} from '@/types/induccion';
import { asRecord } from '@/utils/normalize';

/**
 * Inducción Mr. Lana — `App\Http\Controllers\Api\V1\MiProcesoController`.
 * La inducción ES el PDF oficial (mismo que la web); el avance por página
 * se guarda SIEMPRE en el servidor (nunca solo local): así se retoma donde
 * se quedó en cualquier dispositivo y en la web.
 */
export const induccionApi = {
  /** El PDF oficial (título, ruta y páginas) — compartido por colaborador y RH. */
  async presentacion(): Promise<PdfInduccion> {
    const response = await apiClient.get('/induccion/presentacion');
    return normalizePdfInduccion(asRecord(extractData<unknown>(response.data)).pdf);
  },

  /** Material de explicación (audio/video) activo y si el video ya terminó de procesarse. */
  async material(avanceId: number): Promise<MaterialInduccion> {
    const response = await apiClient.get(`/colaborador/induccion/material/${avanceId}`);
    return normalizeMaterialInduccion(extractData<unknown>(response.data));
  },

  /**
   * Arranca el VIDEO: URL HLS firmada, posición para retomar y cada cuánto
   * reportar. 422 con mensaje en español si el video se está preparando.
   */
  async iniciarVideo(avanceId: number): Promise<SesionVideoInduccion> {
    const response = await apiClient.post(`/colaborador/induccion/video/${avanceId}/iniciar`);
    return normalizeSesionVideoInduccion(extractData<unknown>(response.data));
  },

  /** Reporta la posición; el servidor decide el avance y si se permitió (anti-adelanto). */
  async heartbeatVideo(avanceId: number, posicionSegundos: number): Promise<HeartbeatVideoInduccion> {
    const response = await apiClient.post(`/colaborador/induccion/video/${avanceId}/heartbeat`, { posicion_segundos: Math.max(0, Math.floor(posicionSegundos)) });
    return normalizeHeartbeatVideoInduccion(extractData<unknown>(response.data));
  },

  /** Registra una página MOSTRADA al titular; devuelve el resumen del servidor. */
  async registrarPagina(avanceId: number, pagina: number): Promise<InduccionResumen | null> {
    const response = await apiClient.post(`/colaborador/induccion/capitulos/${avanceId}/pagina`, { pagina });
    return normalizeInduccionResumen(extractData<unknown>(response.data));
  },

  /** «Terminé la inducción»: exige todas las páginas y habilita la evaluación. */
  async terminar(avanceId: number): Promise<{ resumen: InduccionResumen | null; evaluacion: EvaluacionInduccion | null }> {
    const response = await apiClient.post(`/colaborador/induccion/capitulos/${avanceId}/terminar`);
    const data = asRecord(extractData<unknown>(response.data));
    return { resumen: normalizeInduccionResumen(data.resumen), evaluacion: normalizeEvaluacionInduccion(data.evaluacionInduccion) };
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
