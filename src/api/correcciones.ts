import { apiClient, extractData } from './client';

import type { ConteoCorrecciones, Correccion, CorreccionesRespuesta, ResponderCorreccionPayload } from '@/types/correcciones';
import { normalizeConteoCorrecciones, normalizeCorreccion, normalizeCorrecciones } from '@/utils/correcciones';
import { asRecord } from '@/utils/normalize';

/**
 * Correcciones propias — `Api\V1\CorreccionController` (mismo
 * `CorreccionesService` que «Mis solicitudes» en la web).
 */
export const correccionesApi = {
  /** `GET /api/v1/correcciones`: primero las que requieren acción, luego en proceso y las resueltas recientes. */
  async list(): Promise<CorreccionesRespuesta> {
    const response = await apiClient.get('/correcciones');
    return normalizeCorrecciones(response.data);
  },

  /** `GET /api/v1/correcciones/resumen` — solo el contador para el badge. */
  async resumen(): Promise<ConteoCorrecciones> {
    const response = await apiClient.get('/correcciones/resumen');
    return normalizeConteoCorrecciones(extractData<unknown>(response.data));
  },

  /**
   * `POST /api/v1/solicitudes/{id}/responder` — mensaje obligatorio y,
   * opcional, los datos propuestos corregidos. 200 → `{ message, data }`;
   * 422 con el mensaje humano en `errors.mensaje` / `errors["datos.curp"]`.
   */
  async responder(solicitudId: number | string, payload: ResponderCorreccionPayload): Promise<{ message: string | null; correccion: Correccion }> {
    const response = await apiClient.post(`/solicitudes/${solicitudId}/responder`, payload);
    const root = asRecord(response.data);
    return {
      message: typeof root.message === 'string' ? root.message : null,
      correccion: normalizeCorreccion(root.data),
    };
  },
};
