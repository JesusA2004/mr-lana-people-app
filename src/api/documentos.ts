import type { AxiosProgressEvent } from 'axios';

import { apiClient, extractData } from './client';

import type { EmployeeDocumentSummary } from '@/types/document';

export interface UploadDocumentoParams {
  documentTypeId: number;
  fileUri: string;
  fileName: string;
  mimeType: string;
  onProgress?: (percent: number) => void;
}

/**
 * `POST /api/v1/colaborador/documentos` — pendiente en backend (ver
 * docs/MOBILE_BACKEND_REQUIREMENTS.md P0.5). Reutiliza el mismo contrato
 * multipart que ya usa `Rh\SubirDocumentoRequest`
 * (`document_type_id` + `archivo`) para que el backend solo tenga que
 * exponer una ruta nueva sobre `DocumentoStorageService::subirVersion()`,
 * sin inventar un formato distinto para móvil.
 */
export const documentosApi = {
  async upload({ documentTypeId, fileUri, fileName, mimeType, onProgress }: UploadDocumentoParams): Promise<EmployeeDocumentSummary> {
    const formData = new FormData();
    formData.append('document_type_id', String(documentTypeId));
    // React Native FormData: el archivo se describe con { uri, name, type }, no con un Blob real.
    formData.append('archivo', { uri: fileUri, name: fileName, type: mimeType } as unknown as Blob);

    const response = await apiClient.post('/colaborador/documentos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return extractData<EmployeeDocumentSummary>(response.data);
  },
};
