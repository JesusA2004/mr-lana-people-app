import { Directory, File, FileMode, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { API_URL } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';
import {
  mensajeParaErrorDescarga,
  mimeParaTipo,
  nombreArchivoSeguro,
  porcentajeDescarga,
  statusDesdeErrorDescarga,
  utiParaTipo,
} from '@/utils/descargaDocumento';
import { logError } from '@/utils/errors';
import { extensionForSniffedType, sniffFileType, type SniffedFileType } from '@/utils/fileSniff';
import { uniqueTempFileName } from '@/utils/tempFileName';

/** Archivo ya descargado (por ejemplo, por `SecureDocumentViewer`). */
export interface ArchivoLocal {
  uri: string;
  tipo: SniffedFileType;
  /** Bytes, si se conocen. */
  tamano?: number | null;
}

export type EstadoDescarga = 'inactivo' | 'descargando' | 'listo' | 'error';

/** `FLAG_GRANT_READ_URI_PERMISSION` de Android (Intent): la app que abre el PDF puede leer el content:// temporal. */
const FLAG_GRANT_READ_URI_PERMISSION = 1;

/**
 * Descarga AUTENTICADA (Bearer de la sesión) de una ruta relativa de la API
 * a la caché privada de la app, directo a disco (`File.createDownloadTask`,
 * sin ArrayBuffer completo en JS), con progreso real. Detecta el tipo por
 * firma binaria y renombra a la extensión real. Nunca usa una URL pública
 * del NAS: `path` siempre es un endpoint de la API protegido por Policy.
 */
export async function descargarDocumentoPrivado(
  path: string,
  token: string | null,
  opciones: { onProgreso?: (porcentaje: number | null) => void; signal?: AbortSignal } = {},
): Promise<{ archivo: File; tipo: SniffedFileType }> {
  const temporal = new File(Paths.cache, uniqueTempFileName('bin'));
  try {
    const tarea = File.createDownloadTask(`${API_URL}${path}`, temporal, {
      headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/pdf,application/octet-stream,*/*' } : undefined,
      signal: opciones.signal,
      onProgress: ({ bytesWritten, totalBytes }) => opciones.onProgreso?.(porcentajeDescarga(bytesWritten, totalBytes)),
    });
    const descargado = await tarea.downloadAsync();
    if (!descargado || descargado.size === 0) throw new Error('El archivo descargado está vacío.');
    const cabecera = new Uint8Array(await descargado.slice(0, 8).arrayBuffer());
    const tipo = sniffFileType(cabecera);
    const final = new File(Paths.cache, uniqueTempFileName(extensionForSniffedType(tipo)));
    await descargado.move(final);
    return { archivo: final, tipo };
  } catch (error) {
    borrarSinFallar(temporal);
    throw error;
  }
}

function borrarSinFallar(archivo: File | null | undefined) {
  try {
    if (archivo?.exists) archivo.delete();
  } catch {
    // No crítico: el sistema operativo limpia Paths.cache eventualmente.
  }
}

/** El usuario cerró el selector de carpeta / el sheet: no es un error que mostrar. */
function esCancelacion(error: unknown): boolean {
  const mensaje = error instanceof Error ? error.message : String(error ?? '');
  return /cancel/i.test(mensaje);
}

/**
 * «Descargar»: guarda una COPIA con nombre legible fuera de la app.
 * - Android: el usuario elige la carpeta (Storage Access Framework,
 *   `Directory.pickDirectoryAsync()` — sin permisos de almacenamiento) y se
 *   escribe ahí el archivo con su MIME real.
 * - iOS: sheet nativo (`Sharing.shareAsync` con UTI) → «Guardar en Archivos».
 * Devuelve false si la persona canceló.
 */
export async function guardarEnDispositivo(origen: ArchivoLocal, titulo: string): Promise<boolean> {
  const nombre = nombreArchivoSeguro(titulo, extensionForSniffedType(origen.tipo));
  const mime = mimeParaTipo(origen.tipo);

  return guardarArchivoLocal({ uri: origen.uri, nombre, mime, uti: utiParaTipo(origen.tipo), titulo });
}

/** Archivo cualquiera ya en la caché de la app (p. ej. el ZIP del expediente). */
export interface ArchivoParaGuardar {
  uri: string;
  /** Nombre final con extensión («Expediente 4321 - Ana Lopez.zip»). */
  nombre: string;
  mime: string;
  /** UTI de iOS (mejora «Guardar en Archivos»). */
  uti?: string;
  /** Título del sheet nativo. */
  titulo: string;
}

/** Bloque de copia hacia la carpeta elegida (Android): nunca el archivo entero en memoria. */
const BLOQUE_COPIA = 512 * 1024;

/**
 * Copia por bloques con `FileHandle` (sirve para `content://` del Storage
 * Access Framework): un ZIP de cientos de MB nunca se carga completo en JS.
 * Cede el hilo entre bloques para que la pantalla siga respondiendo.
 */
async function copiarPorBloques(origen: File, destino: File): Promise<void> {
  const total = origen.size;
  const lector = origen.open(FileMode.ReadOnly);
  try {
    const escritor = destino.open(FileMode.WriteOnly);
    try {
      let copiados = 0;
      while (copiados < total) {
        const bloque = lector.readBytes(Math.min(BLOQUE_COPIA, total - copiados));
        if (bloque.length === 0) break;
        escritor.writeBytes(bloque);
        copiados += bloque.length;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } finally {
      escritor.close();
    }
  } finally {
    lector.close();
  }
}

/**
 * Guarda una COPIA de un archivo de la caché fuera de la app:
 * - Android: carpeta elegida por la persona (SAF, sin permisos de
 *   almacenamiento), copiada por bloques.
 * - iOS: sheet nativo → «Guardar en Archivos», AirDrop, correo…
 * Devuelve false si la persona canceló.
 */
export async function guardarArchivoLocal(archivo: ArchivoParaGuardar): Promise<boolean> {
  if (Platform.OS === 'android') {
    let carpeta: Directory;
    try {
      carpeta = await Directory.pickDirectoryAsync();
    } catch (error) {
      if (esCancelacion(error)) return false;
      throw error;
    }
    if (!carpeta) return false;
    const destino = carpeta.createFile(archivo.nombre, archivo.mime);
    try {
      await copiarPorBloques(new File(archivo.uri), destino);
    } catch (error) {
      borrarSinFallar(destino);
      throw error;
    }
    return true;
  }

  return compartirArchivoLocal(archivo);
}

/**
 * Sheet nativo de compartir (ambas plataformas): Drive, WhatsApp, correo,
 * «Guardar en Archivos» en iOS. Usa una copia con nombre legible que se
 * borra al cerrar el sheet.
 */
export async function compartirArchivoLocal(archivo: ArchivoParaGuardar): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('compartir-no-disponible');
  }
  const copia = new File(Paths.cache, archivo.nombre);
  try {
    borrarSinFallar(copia);
    await new File(archivo.uri).copy(copia);
    await Sharing.shareAsync(copia.uri, { mimeType: archivo.mime, UTI: archivo.uti, dialogTitle: archivo.titulo });
    return true;
  } finally {
    borrarSinFallar(copia);
  }
}

async function compartirCopia(origen: ArchivoLocal, nombre: string, mime: string, titulo: string): Promise<boolean> {
  return compartirArchivoLocal({ uri: origen.uri, nombre, mime, uti: utiParaTipo(origen.tipo), titulo });
}

/**
 * Descarga AUTENTICADA de un archivo grande (p. ej. el expediente completo
 * en ZIP) directo a disco, con progreso en bytes y cancelable. A diferencia
 * de `descargarDocumentoPrivado` no adivina el tipo: el llamador ya sabe qué
 * pidió (`extension`).
 */
export async function descargarArchivoPrivado(
  path: string,
  token: string | null,
  opciones: { extension: string; accept?: string; onProgreso?: (bytesEscritos: number, bytesTotales: number) => void; signal?: AbortSignal },
): Promise<File> {
  const destino = new File(Paths.cache, uniqueTempFileName(opciones.extension));
  try {
    const tarea = File.createDownloadTask(`${API_URL}${path}`, destino, {
      headers: token ? { Authorization: `Bearer ${token}`, Accept: opciones.accept ?? '*/*' } : undefined,
      signal: opciones.signal,
      onProgress: ({ bytesWritten, totalBytes }) => opciones.onProgreso?.(bytesWritten, totalBytes),
    });
    const descargado = await tarea.downloadAsync();
    if (!descargado || descargado.size === 0) throw new Error('El archivo descargado está vacío.');
    return descargado;
  } catch (error) {
    borrarSinFallar(destino);
    throw error;
  }
}

/** Borra un archivo temporal sin lanzar (para limpiar al cerrar pantallas). */
export function borrarTemporal(archivo: File | null | undefined): void {
  borrarSinFallar(archivo);
}

/**
 * «Abrir con…»: otra app del teléfono (lector de PDF, Drive, WPS…).
 * - Android: intent VIEW con el `content://` del archivo (FileProvider de
 *   expo-file-system, `File.contentUri`) y permiso de lectura temporal.
 * - iOS: sheet nativo, que ofrece «Abrir en…».
 */
export async function abrirConOtraApp(origen: ArchivoLocal, titulo: string): Promise<void> {
  const mime = mimeParaTipo(origen.tipo);
  if (Platform.OS === 'android') {
    const archivo = new File(origen.uri);
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: archivo.contentUri,
        flags: FLAG_GRANT_READ_URI_PERMISSION,
        type: mime,
      });
    } catch (error) {
      logError('abrirConOtraApp', error);
      throw new Error('sin-app');
    }
    return;
  }
  await compartirCopia(origen, nombreArchivoSeguro(titulo, extensionForSniffedType(origen.tipo)), mime, titulo);
}

/** Mensaje humano para errores de guardar/abrir (no de la descarga HTTP). */
export function mensajeErrorAccionLocal(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : '';
  if (mensaje === 'sin-app') return 'No hay una aplicación instalada para abrir este archivo. Instala un lector de PDF o usa «Descargar».';
  if (mensaje === 'compartir-no-disponible') return 'Este dispositivo no permite guardar ni compartir archivos desde la app.';
  return 'No se pudo completar la acción con el archivo. Intenta de nuevo.';
}

export interface UseDescargaDocumentoOpciones {
  /** Ruta relativa a la API (`/colaborador/recibos/12/pdf`). Se ignora si llega `archivoLocal`. */
  path?: string | null;
  /** Archivo que ya está en disco (evita una segunda descarga). */
  archivoLocal?: ArchivoLocal | null;
  /** Título visible: se usa para el nombre sugerido al guardar. */
  titulo: string;
}

export interface UseDescargaDocumentoResultado {
  estado: EstadoDescarga;
  /** 0–100 durante la descarga; null si el servidor no informó el tamaño. */
  progreso: number | null;
  error: string | null;
  archivo: ArchivoLocal | null;
  /** Acción en curso (para el spinner del botón correcto). */
  ocupado: 'guardar' | 'abrir' | null;
  /** Mensaje corto de éxito tras guardar. */
  aviso: string | null;
  guardar: () => Promise<void>;
  abrirCon: () => Promise<void>;
  reintentar: () => void;
}

/**
 * Hook de la descarga de un documento: si recibe `archivoLocal` solo ofrece
 * guardar/abrir; si recibe `path`, primero lo descarga (autenticado, con
 * progreso) la primera vez que la persona pide «Descargar» o «Abrir con…».
 * Borra su copia temporal al desmontarse. Ver `DescargaDocumento`.
 */
export function useDescargaDocumento({ path, archivoLocal, titulo }: UseDescargaDocumentoOpciones): UseDescargaDocumentoResultado {
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const [descargado, setDescargado] = useState<ArchivoLocal | null>(null);
  const [estado, setEstado] = useState<EstadoDescarga>('inactivo');
  const [progreso, setProgreso] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<'guardar' | 'abrir' | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const propioRef = useRef<File | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      borrarSinFallar(propioRef.current);
    },
    [],
  );

  const archivo = archivoLocal ?? descargado;

  const obtener = useCallback(async (): Promise<ArchivoLocal | null> => {
    if (archivoLocal) return archivoLocal;
    if (descargado) return descargado;
    if (!path) return null;
    const controller = new AbortController();
    controllerRef.current = controller;
    setEstado('descargando');
    setProgreso(0);
    setError(null);
    try {
      const { archivo: file, tipo } = await descargarDocumentoPrivado(path, token, { onProgreso: setProgreso, signal: controller.signal });
      propioRef.current = file;
      const local = { uri: file.uri, tipo, tamano: file.size };
      setDescargado(local);
      setEstado('listo');
      return local;
    } catch (err) {
      if (controller.signal.aborted) return null;
      logError('useDescargaDocumento', err);
      if (statusDesdeErrorDescarga(err) === 401) void logout();
      setError(mensajeParaErrorDescarga(err));
      setEstado('error');
      return null;
    } finally {
      setProgreso(null);
    }
  }, [archivoLocal, descargado, path, token, logout]);

  const ejecutar = async (accion: 'guardar' | 'abrir') => {
    if (ocupado) return;
    setOcupado(accion);
    setAviso(null);
    try {
      const local = await obtener();
      if (!local) return;
      setError(null);
      if (accion === 'guardar') {
        const guardado = await guardarEnDispositivo(local, titulo);
        if (guardado && Platform.OS === 'android') setAviso('Documento guardado en la carpeta que elegiste.');
      } else {
        await abrirConOtraApp(local, titulo);
      }
    } catch (err) {
      if (!esCancelacion(err)) {
        logError(`useDescargaDocumento.${accion}`, err);
        setError(mensajeErrorAccionLocal(err));
      }
    } finally {
      setOcupado(null);
    }
  };

  return {
    estado: archivoLocal ? 'listo' : estado,
    progreso,
    error,
    archivo,
    ocupado,
    aviso,
    guardar: () => ejecutar('guardar'),
    abrirCon: () => ejecutar('abrir'),
    reintentar: () => {
      setError(null);
      setEstado('inactivo');
      void ejecutar('guardar');
    },
  };
}
