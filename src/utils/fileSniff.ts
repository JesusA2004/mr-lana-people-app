/**
 * Reconocimiento de tipo de archivo por firma binaria ("magic bytes"),
 * nunca por extensión ni por un `Content-Type` que puede venir mal o
 * ausente (AGENTS.md de este encargo, sección "VISOR PDF": "Si Content-Type
 * es desconocido: NO intentar mostrar .bin como imagen"). Se usa después de
 * descargar el archivo directo a disco (ver `SecureDocumentViewer`), donde
 * ya no tenemos acceso a los headers HTTP de la respuesta.
 */
export type SniffedFileType = 'pdf' | 'png' | 'jpeg' | 'unknown';

export function sniffFileType(bytes: Uint8Array): SniffedFileType {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) {
    return 'pdf'; // "%PDF-"
  }
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  return 'unknown';
}

export function extensionForSniffedType(type: SniffedFileType): string {
  switch (type) {
    case 'pdf':
      return 'pdf';
    case 'png':
      return 'png';
    case 'jpeg':
      return 'jpg';
    default:
      return 'bin';
  }
}
