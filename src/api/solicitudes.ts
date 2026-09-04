import type { AxiosProgressEvent } from 'axios';

import { apiClient, extractData } from './client';

import type { CreateSolicitudPayload, Solicitud, SolicitudDocumentoAdjunto } from '@/types/request';

export interface UploadSolicitudAdjuntoParams {
  solicitudId: number | string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  onProgress?: (percent: number) => void;
}

export const solicitudesApi = {
  async getAll(): Promise<Solicitud[]> {
    const response = await apiClient.get('/solicitudes');
    return extractData<Solicitud[]>(response.data);
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
   * `POST /api/v1/solicitudes/{id}/cancelar` — pendiente en backend (ver
   * docs/MOBILE_BACKEND_REQUIREMENTS.md P0.6). `SolicitudesService::cancelar()`
   * ya existe y ya se usa en la web (`solicitudes.cancelar`); solo falta la
   * ruta equivalente en `Api\V1\SolicitudController`.
   */
  async cancel(id: number | string): Promise<Solicitud> {
    const response = await apiClient.post(`/solicitudes/${id}/cancelar`);
    return extractData<Solicitud>(response.data);
  },

  /**
   * `POST /api/v1/solicitudes/{id}/documentos` — pendiente en backend (ver
   * docs/MOBILE_BACKEND_REQUIREMENTS.md P0.6). Mismo contrato que ya usa la
   * web (`solicitudes.documentos.store`, `SubirDocumentoSolicitudRequest`:
   * un único campo `archivo`), reutilizando
   * `SolicitudesService::adjuntarDocumento()`.
   */
  async uploadAdjunto({ solicitudId, fileUri, fileName, mimeType, onProgress }: UploadSolicitudAdjuntoParams): Promise<SolicitudDocumentoAdjunto> {
    const formData = new FormData();
    formData.append('archivo', { uri: fileUri, name: fileName, type: mimeType } as unknown as Blob);

    const response = await apiClient.post(`/solicitudes/${solicitudId}/documentos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return extractData<SolicitudDocumentoAdjunto>(response.data);
  },
};
