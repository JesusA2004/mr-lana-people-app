import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { logError } from './errors';

/**
 * Compresión de fotos de documentos ANTES de subirlas (registro, expediente,
 * solicitudes): una foto de 12 MP pesa 4–8 MB y tarda en datos móviles; a
 * 2000 px de lado largo y JPEG 0.7 queda en ~300–700 KB y sigue siendo
 * perfectamente legible para RH (INE, CURP, comprobantes). PDFs y videos no
 * se tocan.
 */

/** Lado largo máximo en px: legible para OCR/RH y liviano para datos móviles. */
export const LADO_MAXIMO_PX = 2000;
/** Calidad JPEG (0–1). */
export const CALIDAD_JPEG = 0.7;

export interface ImagenParaSubir {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

/** ¿Conviene redimensionar? Solo si algún lado pasa del máximo. */
export function medidaDestino(ancho: number, alto: number, maximo: number = LADO_MAXIMO_PX): { width: number } | { height: number } | null {
  if (ancho <= 0 || alto <= 0) return null;
  if (Math.max(ancho, alto) <= maximo) return null;
  return ancho >= alto ? { width: maximo } : { height: maximo };
}

/** Mismo nombre con extensión .jpg (la foto comprimida siempre sale en JPEG). */
export function nombreJpg(nombre: string): string {
  const base = nombre.replace(/\.[A-Za-z0-9]+$/, '');
  return `${base || 'foto'}.jpg`;
}

/**
 * Devuelve la imagen comprimida (JPEG). Si algo falla, regresa el archivo
 * original: nunca bloquea la subida por la compresión.
 */
export async function comprimirImagen(archivo: ImagenParaSubir): Promise<ImagenParaSubir> {
  if (!archivo.mimeType.startsWith('image/')) return archivo;

  try {
    const contexto = ImageManipulator.manipulate(archivo.uri);
    const original = await contexto.renderAsync();
    const destino = medidaDestino(original.width, original.height);
    const imagen = destino ? await contexto.resize(destino).renderAsync() : original;
    const resultado = await imagen.saveAsync({ compress: CALIDAD_JPEG, format: SaveFormat.JPEG });

    return { uri: resultado.uri, name: nombreJpg(archivo.name), mimeType: 'image/jpeg' };
  } catch (error) {
    logError('comprimirImagen', error);
    return archivo;
  }
}
