import { apiClient, extractData } from './client';
import { normalizeContenidoEvaluacion, normalizeEvaluacionInduccion, normalizeInduccionResumen, normalizePdfInduccion } from './normalizers/induccion';

import type { ContenidoEvaluacionInduccion, EvaluacionInduccion, InduccionResumen, OpinionInduccion, PdfInduccion, RespuestasInduccion } from '@/types/induccion';
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
