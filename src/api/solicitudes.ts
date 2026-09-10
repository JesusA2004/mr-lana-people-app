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
   * `POST /api/v1/solicitudes/{id}/adjuntos` — PDF/JPG/PNG, solo a
   * solicitudes propias. Usado por el paso "Adjuntos" del wizard de Nueva
   * Solicitud cuando `solicitudesApi.getConfiguracion()` marca
   * `allows_attachments` para el tipo elegido (AGENTS.md sección 44-46).
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
   * `GET /api/v1/solicitudes/configuracion` — catálogo real de tipos +
   * reglas de formulario (`requires_dates`/`allows_attachments`/
   * `attachment_required`), derivado de `App\Enums\TipoSolicitudInterna` en
   * el backend. `solicitud/nueva.tsx` lo usa como fuente de verdad; el
   * catálogo local `REQUEST_TYPE_OPTIONS` solo aporta ícono/descripción
   * (cosmético) y sirve de respaldo mientras esta consulta carga.
   */
  async getConfiguracion(): Promise<SolicitudTipoConfig[]> {
    const response = await apiClient.get('/solicitudes/configuracion');
    return extractData<SolicitudTipoConfig[]>(response.data);
  },
};
