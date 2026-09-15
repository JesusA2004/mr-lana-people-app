import type { AxiosProgressEvent } from 'axios';

import { apiClient, extractData } from './client';

import type { PaginatedResponse } from '@/types/api';
import type {
  CancelSolicitudRespuesta,
  CreateSolicitudPayload,
  Solicitud,
  SolicitudAdjuntoRespuesta,
  SolicitudTipoConfig,
} from '@/types/request';
import { normalizeSolicitudesConfiguracion } from '@/utils/solicitudesConfig';

/**
 * Solicitudes unificadas (`App\Http\Controllers\Api\V1\SolicitudController`).
 * ESTE es el único camino para crear cualquier solicitud, vacaciones
 * incluidas — `src/api/vacaciones.ts` quedó deprecado y solo se consulta
 * para el saldo (ver `docs/BACKEND_SYNC_2026_09_15.md`).
 */
export const solicitudesApi = {
  /** Primera página tal cual — usada donde solo hace falta una lectura rápida (ej. el badge del tab). */
  async getAll(): Promise<Solicitud[]> {
    const response = await apiClient.get('/solicitudes');
    return extractData<Solicitud[]>(response.data);
  },

  /** Página completa CON `meta` (`current_page`/`last_page`/`total`) — base de `useSolicitudesInfinite`. */
  async getPage(page: number): Promise<PaginatedResponse<Solicitud>> {
    const response = await apiClient.get('/solicitudes', { params: { page } });
    return response.data as PaginatedResponse<Solicitud>;
  },

  async getById(id: number | string): Promise<Solicitud> {
    const response = await apiClient.get(`/solicitudes/${id}`);
    return extractData<Solicitud>(response.data);
  },

  /** `POST /api/v1/solicitudes` — responde 201 con el Resource plano (sin envoltura `data`). */
  async create(payload: CreateSolicitudPayload): Promise<Solicitud> {
    const response = await apiClient.post('/solicitudes', payload);
    return extractData<Solicitud>(response.data);
  },

  /**
   * `POST /api/v1/solicitudes/{id}/cancelar` — solo sobre solicitudes
   * propias y solo mientras `EstadoSolicitudInterna::puedeCancelarse()`
   * (`SolicitudInternaPolicy::cancelar()`); si no, el backend responde 403.
   * Devuelve `{ message, data: <solicitud actualizada> }`.
   */
  async cancelar(id: number | string): Promise<CancelSolicitudRespuesta> {
    const response = await apiClient.post(`/solicitudes/${id}/cancelar`);
    return response.data as CancelSolicitudRespuesta;
  },

  /**
   * `POST /api/v1/solicitudes/{id}/adjuntos` — PDF/JPG/PNG, solo a
   * solicitudes propias.
   *
   * El backend responde 201 con SOLO `{"message": "Adjunto agregado
   * correctamente."}`: no existe un objeto adjunto con `id`. La versión
   * anterior hacía `extractData<SolicitudAttachment>()` sobre esa respuesta
   * y se quedaba con el objeto del mensaje creyendo que era un adjunto
   * (bug B-2). Quien suba un archivo debe refrescar el detalle después,
   * no leer un id de aquí.
   *
   * `Content-Type` NO se fija a mano: se deja que Axios/React Native
   * generen el boundary del multipart (sección 44 del encargo).
   */
  async addAttachment(
    solicitudId: number | string,
    file: { uri: string; name: string; mimeType: string },
    onProgress?: (percent: number) => void,
  ): Promise<SolicitudAdjuntoRespuesta> {
    const formData = new FormData();
    formData.append('archivo', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);

    const response = await apiClient.post(`/solicitudes/${solicitudId}/adjuntos`, formData, {
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return (response.data ?? {}) as SolicitudAdjuntoRespuesta;
  },

  /**
   * `GET /api/v1/solicitudes/configuracion` — catálogo real de tipos y sus
   * `campos[]`. La respuesta es `{"tipos": [...]}`; `normalizeSolicitudes-
   * Configuracion` es el único lugar que la interpreta.
   */
  async getConfiguracion(): Promise<SolicitudTipoConfig[]> {
    const response = await apiClient.get('/solicitudes/configuracion');
    return normalizeSolicitudesConfiguracion(response.data);
  },
};
