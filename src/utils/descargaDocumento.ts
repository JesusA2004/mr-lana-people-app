/**
 * Utilidades PURAS (sin módulos nativos) de la descarga de documentos:
 * tamaño legible, nombre de archivo seguro, tipo legible y mensaje de error
 * por status. Las usan `useDescargaDocumento`, `DescargaDocumento` y
 * `SecureDocumentViewer`; se prueban en `__tests__/descargaDocumento.test.ts`.
 */
import type { SniffedFileType } from './fileSniff';

/** «245 KB», «1.2 MB»; null si no se conoce el tamaño. */
export function formatearTamano(bytes: number | null | undefined): string | null {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** Porcentaje 0–100 de una descarga; null si el servidor no mandó Content-Length. */
export function porcentajeDescarga(bytesEscritos: number, bytesTotales: number): number | null {
  if (!Number.isFinite(bytesTotales) || bytesTotales <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((bytesEscritos / bytesTotales) * 100)));
}

const MAX_NOMBRE = 80;

/**
 * Nombre de archivo apto para Android/iOS a partir del título visible
 * («Contrato individual — Juan Pérez»): sin acentos, sin caracteres
 * prohibidos (`/ \ : * ? " < > |`), sin espacios dobles, máx. 80
 * caracteres y SIEMPRE con la extensión real (nunca la del título). Nunca
 * expone UUID ni rutas del NAS: solo usa el texto que ya ve la persona.
 */
export function nombreArchivoSeguro(titulo: string | null | undefined, extension: string): string {
  const ext = extension.replace(/^\.+/, '').toLowerCase() || 'bin';
  let base = (titulo ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(new RegExp(`\\.${ext}$`, 'i'), '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/[^A-Za-z0-9 ._()-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s]+|[.\s]+$/g, '');
  if (base.length > MAX_NOMBRE) base = base.slice(0, MAX_NOMBRE).trim();
  if (base === '') base = 'documento';
  return `${base}.${ext}`;
}

/** MIME real a partir del tipo detectado por firma binaria. */
export function mimeParaTipo(tipo: SniffedFileType): string {
  switch (tipo) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpeg':
      return 'image/jpeg';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
}

/** UTI de iOS para el sheet de compartir (mejora «Guardar en Archivos»/«Abrir en…»). */
export function utiParaTipo(tipo: SniffedFileType): string | undefined {
  switch (tipo) {
    case 'pdf':
      return 'com.adobe.pdf';
    case 'png':
      return 'public.png';
    case 'jpeg':
      return 'public.jpeg';
    case 'docx':
      return 'org.openxmlformats.wordprocessingml.document';
    default:
      return undefined;
  }
}

/** «Documento PDF», «Imagen JPG»… acepta tipo detectado o MIME. */
export function tipoLegible(tipoOMime: SniffedFileType | string | null | undefined): string {
  const t = (tipoOMime ?? '').toLowerCase();
  if (t === 'pdf' || t === 'application/pdf') return 'Documento PDF';
  if (t === 'jpeg' || t === 'jpg' || t === 'image/jpeg' || t === 'image/jpg') return 'Imagen JPG';
  if (t === 'png' || t === 'image/png') return 'Imagen PNG';
  if (t === 'docx' || t.includes('wordprocessingml') || t === 'application/msword') return 'Documento de Word';
  if (t.startsWith('image/')) return 'Imagen';
  return 'Archivo';
}

/** Texto del botón principal: «Descargar PDF» solo si de verdad es PDF. */
export function etiquetaDescarga(tipo: SniffedFileType | null | undefined): string {
  if (tipo === 'pdf') return 'Descargar PDF';
  if (tipo === 'png' || tipo === 'jpeg') return 'Descargar imagen';
  return 'Descargar archivo';
}

/**
 * Status HTTP real de un error de `File.createDownloadTask().downloadAsync()`:
 * el mensaje nativo de expo-file-system lo incluye («HTTP 404» en Android,
 * «server returned HTTP 404» en iOS). También acepta errores de Axios
 * (`response.status`).
 */
export function statusDesdeErrorDescarga(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'response' in error) {
    const status = (error as { response?: { status?: unknown } }).response?.status;
    if (typeof status === 'number') return status;
  }
  if (!(error instanceof Error)) return undefined;
  const match = /HTTP\s*(\d{3})/i.exec(error.message);
  return match ? Number(match[1]) : undefined;
}

/** ¿El error es de red/sin conexión (no hubo respuesta del servidor)? */
export function esErrorDeRed(error: unknown): boolean {
  if (statusDesdeErrorDescarga(error) !== undefined) return false;
  const mensaje = error instanceof Error ? error.message : String(error ?? '');
  return /network|internet|offline|timed? ?out|unable to resolve|connection|conexi[oó]n|UnknownHost|SocketTimeout/i.test(mensaje);
}

/** Mensaje humano, en español, para cualquier falla de descarga. Nunca texto técnico. */
export function mensajeErrorDescarga(status: number | undefined, deRed = false): string {
  switch (status) {
    case 401:
      return 'Tu sesión ha expirado. Vuelve a iniciar sesión para descargar el documento.';
    case 403:
      return 'No tienes permiso para descargar este documento.';
    case 404:
      return 'Este documento ya no está disponible. Pide a Recursos Humanos que lo revise.';
    case 410:
      return 'Este documento ya no está vigente.';
    case 413:
      return 'El documento es demasiado grande para descargarlo en el teléfono. Pídelo a Recursos Humanos.';
    case 503:
      return 'El almacenamiento de documentos no está disponible en este momento. Intenta de nuevo en unos minutos.';
    default:
      if (status !== undefined && status >= 500) return 'Tuvimos un problema de nuestro lado. Intenta más tarde.';
      if (deRed || status === undefined) return 'No pudimos descargar el documento. Revisa tu conexión a internet e intenta de nuevo.';
      return 'No pudimos descargar el documento. Intenta de nuevo.';
  }
}

/** Mensaje para un error cualquiera (status + red). */
export function mensajeParaErrorDescarga(error: unknown): string {
  return mensajeErrorDescarga(statusDesdeErrorDescarga(error), esErrorDeRed(error));
}

/**
 * «3.4 MB de 12 MB» (o solo «3.4 MB» si el servidor no mandó Content-Length)
 * para la pantalla de descarga de archivos grandes (expediente en ZIP).
 */
export function progresoEnBytes(bytesEscritos: number, bytesTotales: number | null | undefined): string | null {
  const escritos = formatearTamano(bytesEscritos);
  if (!escritos) return null;
  const total = formatearTamano(bytesTotales ?? null);
  return total ? `${escritos} de ${total}` : escritos;
}

/** Mensaje de error de la descarga del expediente completo (ZIP). */
export function mensajeErrorDescargaExpediente(status: number | undefined, deRed = false): string {
  switch (status) {
    case 403:
      return 'No tienes permiso para descargar el expediente completo.';
    case 404:
      return 'No encontramos este expediente. Actualiza la pantalla e intenta de nuevo.';
    case 429:
      return 'Ya pediste varias descargas seguidas. Espera un minuto e intenta de nuevo.';
    default:
      return mensajeErrorDescarga(status, deRed).replace('el documento', 'el expediente');
  }
}

/**
 * Tipo esperado ANTES de descargar, por la extensión del nombre original
 * (solo para el texto/icono del botón; al bajar, manda la firma binaria).
 */
export function tipoEsperadoPorNombre(nombre: string | null | undefined): SniffedFileType {
  const ext = /\.([a-z0-9]+)$/i.exec(nombre ?? '')?.[1]?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg';
  if (ext === 'png') return 'png';
  if (ext === 'docx') return 'docx';
  return 'pdf';
}
