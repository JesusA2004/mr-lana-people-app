import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { medidaDestino } from './comprimirImagen';
import { getFieldError, logError, normalizeError } from './errors';

import type { LocalUploadFile } from '@/api/upload';

/**
 * Fotografía para expediente (= foto de perfil, docs/FOTO_EXPEDIENTE.md en
 * capacitaciones). La app recorta 1:1 en el editor nativo y aquí la deja en
 * 1024 px de lado (JPEG ~0.8): el servidor vuelve a normalizar a 800×800,
 * así que subir 12 MP solo gasta datos. Se redimensiona CONSERVANDO la
 * proporción (nunca se deforma): con el recorte cuadrado queda 1024×1024.
 */
export const LADO_FOTO_PX = 1024;
export const CALIDAD_FOTO = 0.8;
/** Límite del backend (SubirFotoRequest: 8 MB). */
export const MAX_FOTO_MB = 8;
const MIMES_FOTO = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface AssetFoto {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

/** Valida lo que devolvió el picker: tamaño y formato (el backend vuelve a verificar el MIME real). */
export function validarAssetFoto(asset: AssetFoto): { archivo: LocalUploadFile } | { error: string } {
  if (asset.fileSize && asset.fileSize > MAX_FOTO_MB * 1024 * 1024) return { error: `La foto supera ${MAX_FOTO_MB} MB. Elige otra.` };
  const mime = asset.mimeType ?? 'image/jpeg';
  if (!MIMES_FOTO.includes(mime)) return { error: 'La foto debe ser JPG, PNG o WEBP.' };
  const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return { archivo: { uri: asset.uri, name: asset.fileName ?? `foto-perfil.${extension}`, mimeType: mime } };
}

/**
 * Lado largo a 1024 px (sin agrandar una foto chica) y JPEG 0.8. Si el
 * manipulador falla, se sube la original: la compresión nunca bloquea.
 */
export async function prepararFotoExpediente(archivo: LocalUploadFile): Promise<LocalUploadFile> {
  try {
    const contexto = ImageManipulator.manipulate(archivo.uri);
    const original = await contexto.renderAsync();
    const destino = medidaDestino(original.width, original.height, LADO_FOTO_PX);
    const imagen = destino ? await contexto.resize(destino).renderAsync() : original;
    const resultado = await imagen.saveAsync({ compress: CALIDAD_FOTO, format: SaveFormat.JPEG });
    return { uri: resultado.uri, name: 'foto-expediente.jpg', mimeType: 'image/jpeg' };
  } catch (error) {
    logError('prepararFotoExpediente', error);
    return archivo;
  }
}

/** Mensaje específico de por qué no subió la foto (qué hacer después). */
export function mensajeErrorSubidaFoto(error: unknown): string {
  const normalizado = normalizeError(error);
  if (normalizado.isOffline) return 'No tienes conexión. Conéctate a internet o a datos y toca «Reintentar».';
  if (normalizado.isNetworkError) return 'No pudimos subir tu foto: la conexión es inestable o el servidor tardó en responder. Toca «Reintentar».';
  if (normalizado.status === 422) return getFieldError(error, 'foto') ?? normalizado.message;
  if (normalizado.status === 413) return `La foto es demasiado pesada. Elige otra de menos de ${MAX_FOTO_MB} MB.`;
  if (normalizado.status !== undefined && normalizado.status >= 500) return 'El servidor tuvo un problema al guardar tu foto. Toca «Reintentar» en unos minutos.';
  return normalizado.message;
}
