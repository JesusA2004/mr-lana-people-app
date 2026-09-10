/**
 * Nombre temporal SIEMPRE único (timestamp + sufijo aleatorio) — nunca
 * derivado de `downloadFileName`/título del documento (AGENTS.md de este
 * encargo, sección "CACHE DOCUMENTOS": "no quiero colisiones... no
 * reutilizar el mismo path cache si se abren dos documentos con igual
 * título"). `downloadFileName` sigue siendo el nombre SUGERIDO solo al
 * guardar/compartir (ver `SecureDocumentViewer`), nunca el del archivo en
 * `Paths.cache`.
 */
export function uniqueTempFileName(extension: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `mrlana-doc-${Date.now()}-${random}.${extension}`;
}
