/**
 * Reconocimiento de tipo de archivo por firma binaria ("magic bytes"),
 * nunca por extensión ni por un `Content-Type` que puede venir mal o
 * ausente (AGENTS.md de este encargo, sección "VISOR PDF": "Si Content-Type
 * es desconocido: NO intentar mostrar .bin como imagen"). Se usa después de
 * descargar el archivo directo a disco (ver `SecureDocumentViewer`), donde
 * ya no tenemos acceso a los headers HTTP de la respuesta.
 *
 * `docx` se agregó en la sincronización 2026-09-15: un DOCX es un ZIP
 * (firma `PK\x03\x04`) — antes caía en `unknown` y el visor lo trataba como
 * "no compartible" aunque la descarga hubiera sido perfectamente válida
 * (`Rh\FormatoController::descargar` sirve el DOCX crudo de un formato
 * generado). Detectarlo explícitamente permite compartirlo con la
 * extensión correcta.
 */
export type SniffedFileType = 'pdf' | 'png' | 'jpeg' | 'docx' | 'unknown';

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
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)) {
    // "PK\x03\x04" (normal), "PK\x05\x06" (zip vacío) o "PK\x07\x08"
    // (spanned) — los tres son contenedores ZIP. El único documento ZIP que
    // sirve esta API es un DOCX (plantillas de RH), así que se etiqueta
    // como tal en vez de dejarlo en `unknown`.
    return 'docx';
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
    case 'docx':
      return 'docx';
    default:
      return 'bin';
  }
}

/**
 * true solo para los tipos que `SecureDocumentViewer` sabe dibujar
 * (WebView para PDF, `Image` para PNG/JPEG). Un DOCX o cualquier otro tipo
 * reconocible-pero-no-visualizable es "downloadable-only": el visor no lo
 * pinta, pero SÍ puede guardarse/compartirse si `allowDownload` lo permite
 * — nunca se confunde con un archivo inválido.
 */
export function isPreviewableSniffedType(type: SniffedFileType): boolean {
  return type === 'pdf' || type === 'png' || type === 'jpeg';
}
