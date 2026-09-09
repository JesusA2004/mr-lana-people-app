import type { AxiosProgressEvent } from 'axios';

import { apiClient, extractData } from './client';

import type { PaginatedResponse } from '@/types/api';
import type { CreateSolicitudPayload, Solicitud, SolicitudAttachment, SolicitudTipoConfig } from '@/types/request';

export const solicitudesApi = {
  /** Primera página tal cual — usada donde solo hace falta una lectura rápida (ej. el badge del tab). */
  async getAll(): Promise<Solicitud[]> {
    const response = await apiClient.get('/solicitudes');
    return extractData<Solicitud[]>(response.data);
  },

  /**
   * Página completa CON `meta` (`current_page`/`last_page`/`total`) — el
   * backend (`Api\V1\SolicitudController::index`) ya pagina, pero
   * `getAll()` la descartaba: un colaborador con más solicitudes que el
   * tamaño de página de Laravel nunca veía el resto. Usada por
   * `useSolicitudesInfinite` para scroll infinito real.
   */
  async getPage(page: number): Promise<PaginatedResponse<Solicitud>> {
    const response = await apiClient.get('/solicitudes', { params: { page } });
    return response.data as PaginatedResponse<Solicitud>;
  },

  async getById(id: number | string): Promise<Solicitud> {
    const response = await apiClient.get(`/solicitudes/${id}`);
    return extractData<Solicitud>(response.data);
  },

  async create(payload: CreateSolicitudPayload): Promise<Solicitud> {
    const response = await apiClient.post('/solicitudes', payload);
    return extractData<Solicitud>(response.data);
  },

  /**
   * `POST /api/v1/solicitudes/{id}/adjuntos` — todavía NO existe en
   * capacitaciones (ver docs/BACKEND_REQUIREMENTS_V4.md, P1). Se deja el
   * cliente listo y desacoplado para conectarlo en cuanto el backend lo
   * agregue; hoy nada lo llama (el wizard de Nueva Solicitud no tiene paso
   * de adjuntos) para no fabricar una capacidad que el backend no soporta.
   */
  async addAttachment(
    solicitudId: number | string,
    file: { uri: string; name: string; mimeType: string },
    onProgress?: (percent: number) => void,
  ): Promise<SolicitudAttachment> {
    const formData = new FormData();
    formData.append('archivo', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);

    const response = await apiClient.post(`/solicitudes/${solicitudId}/adjuntos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return extractData<SolicitudAttachment>(response.data);
  },

  /**
   * `GET /api/v1/solicitudes/configuracion` — todavía NO existe en
   * capacitaciones (ver docs/BACKEND_REQUIREMENTS_V4.md, P2). En cuanto
   * exista, `solicitud/nueva.tsx` puede reemplazar el catálogo fijo
   * `REQUEST_TYPE_OPTIONS` por esta respuesta sin cambiar la UI del wizard.
   */
  async getConfiguracion(): Promise<SolicitudTipoConfig[]> {
    const response = await apiClient.get('/solicitudes/configuracion');
    return extractData<SolicitudTipoConfig[]>(response.data);
  },
};
