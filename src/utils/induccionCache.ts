import { File, Paths } from 'expo-file-system';

import { hashForCacheName, PREFIJO_CACHE_INDUCCION } from './privateAssetCache';
import { esErrorDeRed } from './descargaDocumento';
import { uniqueTempFileName } from './tempFileName';

/** Lo que dice el servidor del PDF vigente (cabeceras del HEAD). */
export interface VersionPdf {
  ultimaModificacion?: string | null;
  tamano?: number | null;
}

/**
 * Nombre de caché ligado a la VERSIÓN del archivo: si RH reemplaza la inducción
 * con el mismo número de páginas, cambia `Last-Modified`/tamaño y por tanto el
 * nombre, y nunca se sirve el PDF anterior.
 */
export function nombreCacheInduccion(path: string, version: VersionPdf): string {
  return `${PREFIJO_CACHE_INDUCCION}${hashForCacheName(`${path}|${version.ultimaModificacion ?? ''}|${version.tamano ?? ''}`)}.pdf`;
}

function versionesGuardadas(): File[] {
  try {
    return Paths.cache.list().filter((entry): entry is File => entry instanceof File && entry.name.startsWith(PREFIJO_CACHE_INDUCCION));
  } catch {
    return [];
  }
}

function borrar(archivo: File) {
  try {
    if (archivo.exists) archivo.delete();
  } catch {
    // No crítico: el arranque o el logout lo vuelven a intentar.
  }
}

/**
 * Solo un PDF completo llega a la caché: firma `%PDF` y, si el servidor lo
 * informó, el tamaño exacto. Si el tamaño del HEAD no cuadra (un proxy que
 * comprime o cambia la cabecera) se acepta igual cuando el archivo trae su
 * cierre `%%EOF`: un PDF cortado a la mitad nunca lo trae.
 */
async function esPdfCompleto(archivo: File, tamanoEsperado: number | null | undefined): Promise<boolean> {
  if (!archivo.exists || archivo.size === 0) return false;
  const cabecera = new Uint8Array(await archivo.slice(0, 4).arrayBuffer());
  if (String.fromCharCode(...cabecera) !== '%PDF') return false;
  if (!tamanoEsperado || archivo.size === tamanoEsperado) return true;
  const inicioCola = Math.max(0, archivo.size - 1024);
  const cola = new Uint8Array(await archivo.slice(inicioCola, archivo.size).arrayBuffer());
  return tieneCierrePdf(cola);
}

/** ¿Los últimos bytes del archivo contienen el marcador de fin `%%EOF`? */
export function tieneCierrePdf(cola: Uint8Array): boolean {
  let texto = '';
  for (const byte of cola) texto += String.fromCharCode(byte);
  return texto.includes('%%EOF');
}

export interface ObtenerPdfInduccionOpciones {
  path: string;
  /** Pide la versión vigente (HEAD por el cliente de la app: 401/403/409 siguen su pipeline). */
  consultarVersion: () => Promise<VersionPdf>;
  /** Baja el archivo a `destino`. Puede dejar un parcial si se corta. */
  descargar: (destino: File) => Promise<unknown>;
}

/**
 * PDF de la inducción en caché, con escritura ATÓMICA: se baja a un temporal
 * `mrlana-doc-*` (lo barre el arranque si la app muere a la mitad), se verifica
 * completo y solo entonces se mueve a su nombre final. Salir a media descarga
 * nunca deja un archivo a medias reutilizable.
 *
 * Sin red se usa la última versión completa que haya: leer la inducción sin
 * conexión ya funcionaba. Cualquier respuesta del servidor (401, 403…) sí corta.
 */
export async function obtenerPdfInduccion({ path, consultarVersion, descargar }: ObtenerPdfInduccionOpciones): Promise<File> {
  let version: VersionPdf;
  try {
    version = await consultarVersion();
  } catch (error) {
    const guardada = esErrorDeRed(error) ? versionesGuardadas()[0] : undefined;
    if (guardada) return guardada;
    throw error;
  }

  const destino = new File(Paths.cache, nombreCacheInduccion(path, version));
  if (await esPdfCompleto(destino, version.tamano)) return destino;

  const temporal = new File(Paths.cache, uniqueTempFileName('pdf'));
  try {
    await descargar(temporal);
    if (!(await esPdfCompleto(temporal, version.tamano))) {
      throw new Error('El PDF de la inducción llegó incompleto.');
    }
    for (const vieja of versionesGuardadas()) borrar(vieja);
    await temporal.move(destino);
    return temporal;
  } catch (error) {
    borrar(temporal);
    throw error;
  }
}

/** pdf.js no pudo dibujarlo: esa copia no se vuelve a usar. */
export function descartarPdfInduccion(): void {
  for (const archivo of versionesGuardadas()) borrar(archivo);
}
