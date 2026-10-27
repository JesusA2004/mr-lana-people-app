import type { AxiosProgressEvent } from 'axios';

import { apiClient, extractData } from './client';

import type { IncorporacionResponse } from '@/types/incorporation';

export interface UploadDocumentoParams {
  /** Id del TIPO de documento (`document_types.id`, el mismo `documento.id` del checklist). */
  documentTypeId: number;
  fileUri: string;
  fileName: string;
  mimeType: string;
  /** El archivo trae también el documento par (`documento.par`): el backend lo registra en ambos. */
  incluyePar?: boolean;
  onProgress?: (percent: number) => void;
}

/**
 * Subida/solicitud de cambio de un documento del checklist de incorporación
 * — `App\Http\Controllers\Api\V1\IncorporacionController` en capacitaciones.
 */
export const documentosApi = {
  /**
   * `POST /api/v1/colaborador/incorporacion/documentos/{documentoRequerido}/subir`.
   * Campo multipart `archivo` (`App\Http\Requests\Api\V1\SubirDocumentoIncorporacionRequest`,
   * PDF/JPG/JPEG/PNG, máx. `config('expedientes.max_upload_mb')`, hoy 20 MB).
   * Solo se acepta si el documento nunca se subió, o está
   * rechazado/requiere_correccion/vencido/cambio_autorizado — si está
   * en_revision o aprobado, el backend responde 422 (hay que solicitar
   * cambio primero). La respuesta es el estado completo de la incorporación
   * (no solo el documento subido), igual que devuelve el propio controlador.
   */
  async upload({ documentTypeId, fileUri, fileName, mimeType, incluyePar, onProgress }: UploadDocumentoParams): Promise<IncorporacionResponse> {
    const formData = new FormData();
    // React Native FormData: el archivo se describe con { uri, name, type }, no con un Blob real.
    formData.append('archivo', { uri: fileUri, name: fileName, type: mimeType } as unknown as Blob);
    // Regla `boolean` de Laravel: acepta '1'/'0', no 'true'.
    if (incluyePar) formData.append('incluye_par', '1');

    const response = await apiClient.post(`/colaborador/incorporacion/documentos/${documentTypeId}/subir`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return extractData<IncorporacionResponse>(response.data);
  },

  /**
   * `POST /api/v1/colaborador/incorporacion/documentos/{documento}/solicitar-cambio`
   * — sin body. Único camino para reemplazar un documento que ya está
   * en_revision o aprobado: RH debe autorizar el cambio
   * (`cambio_autorizado`) antes de que `upload()` vuelva a aceptar archivo.
   */
  async solicitarCambio(documentTypeId: number): Promise<{ message: string }> {
    const response = await apiClient.post(`/colaborador/incorporacion/documentos/${documentTypeId}/solicitar-cambio`);
    return extractData<{ message: string }>(response.data);
  },
};
