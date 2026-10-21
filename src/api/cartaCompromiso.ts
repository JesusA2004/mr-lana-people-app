import type { File } from 'expo-file-system';

import { apiClient, extractData } from './client';

import type { EstadoCartaCompromisoResponse } from '@/types/cartaCompromiso';

/**
 * Carta compromiso de documentos pendientes (capacitaciones,
 * `colaborador/carta-compromiso`). Estos endpoints siguen disponibles aunque
 * la cuenta esté limitada por documentos pendientes.
 */
export const cartaCompromisoApi = {
  /** `GET /colaborador/carta-compromiso` — carta vigente, documentos pendientes y bloqueo. */
  async estado(): Promise<EstadoCartaCompromisoResponse> {
    const response = await apiClient.get('/colaborador/carta-compromiso');
    return extractData<EstadoCartaCompromisoResponse>(response.data);
  },

  /** Ruta relativa del PDF de la carta (`SecureDocumentViewer` la descarga con el Bearer). */
  pdfPath(): string {
    return '/colaborador/carta-compromiso/pdf';
  },

  /**
   * `POST /colaborador/carta-compromiso/vista-previa` `{ documentos }` →
   * PDF. Es POST (lleva la lista), así que no sirve `File.createDownloadTask`
   * (solo GET): se pide como `arraybuffer` — la carta es de una o dos
   * páginas — y se escribe en `destino` (caché privada de la app).
   */
  async vistaPrevia(documentos: number[], destino: File, signal?: AbortSignal): Promise<File> {
    const response = await apiClient.post<ArrayBuffer>(
      '/colaborador/carta-compromiso/vista-previa',
      { documentos },
      // Accept sigue siendo JSON (cabecera global): así un 403/422 llega como JSON y no como redirección.
      { responseType: 'arraybuffer', signal },
    );
    const bytes = new Uint8Array(response.data);
    if (bytes.byteLength === 0) throw new Error('El archivo descargado está vacío.');
    if (!destino.exists) destino.create();
    destino.write(bytes);
    return destino;
  },
};
