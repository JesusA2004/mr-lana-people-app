/**
 * Tipos de archivo que acepta cada hoja de carga. Por defecto (expediente,
 * solicitudes…) solo PDF/JPG/PNG; las acciones que el backend permite con
 * video (estudio socioeconómico: `mimes:jpg,jpeg,png,pdf,mp4,mov`) lo
 * activan explícitamente con `allowVideo`.
 */
export const MIME_DOCUMENTOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'] as const;
export const MIME_VIDEO = ['video/mp4', 'video/quicktime'] as const;

export function mimesAceptados(allowVideo: boolean): string[] {
  return allowVideo ? [...MIME_DOCUMENTOS, ...MIME_VIDEO] : [...MIME_DOCUMENTOS];
}

export function esVideo(mimeType: string | null | undefined): boolean {
  return typeof mimeType === 'string' && mimeType.startsWith('video/');
}

/** Rechaza en cliente lo que el backend no aceptaría (el backend vuelve a validar). */
export function archivoPermitido(mimeType: string | null | undefined, allowVideo: boolean): boolean {
  if (!mimeType) return false;
  return mimesAceptados(allowVideo).includes(mimeType);
}

/** Nombre por defecto cuando el picker no da uno (nunca "undefined"). */
export function nombrePorDefecto(mimeType: string | null | undefined, ahora = Date.now()): string {
  if (esVideo(mimeType)) return `video-${ahora}.${mimeType === 'video/quicktime' ? 'mov' : 'mp4'}`;
  if (mimeType === 'image/png') return `imagen-${ahora}.png`;
  if (mimeType === 'application/pdf') return `documento-${ahora}.pdf`;
  return `foto-${ahora}.jpg`;
}
