/**
 * Archivo local seleccionado con DocumentPicker/ImagePicker/cámara, listo
 * para ir en un multipart de React Native (`{ uri, name, type }`, no un
 * Blob real). Un solo tipo compartido por todos los clientes que suben
 * archivos del ciclo laboral (escaneo, aviso, finiquito firmado, anexos,
 * comprobante de envío, importación de recibos).
 */
export interface LocalUploadFile {
  uri: string;
  name: string;
  mimeType: string;
}

export function appendFile(formData: FormData, field: string, file: LocalUploadFile): void {
  formData.append(field, { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
}

export const multipartHeaders = { 'Content-Type': 'multipart/form-data' } as const;
