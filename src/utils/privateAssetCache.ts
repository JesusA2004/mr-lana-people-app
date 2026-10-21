import { File, Paths } from 'expo-file-system';

/** Prefijo de los temporales de documentos (ver `uniqueTempFileName`). */
export const PREFIJO_TEMPORAL_DOCUMENTO = 'mrlana-doc-';

/** Hash corto y estable (no criptográfico, no necesita serlo) para construir un nombre de archivo determinista por URL. */
export function hashForCacheName(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/**
 * v2: extensión real (`.jpg`) en vez de `.bin` genérico. La foto de perfil
 * del backend siempre es JPEG (FotoColaboradorService la normaliza); guardar
 * `.bin` hacía que el visor de Android renderizara el bitmap de forma
 * inconsistente (micro recorte en EditableProfileAvatar). El cambio de
 * versión en el nombre basta para que cualquier `.bin` viejo en caché deje
 * de usarse (queda huérfano hasta que el SO limpie `Paths.cache`), sin
 * necesidad de migrar archivos existentes.
 */
export function privateAssetCacheFileName(userId: number | string, remoteUrl: string): string {
  return `private-asset-v2-${userId}-${hashForCacheName(remoteUrl)}.jpg`;
}

/**
 * Borra todo lo cacheado de este usuario (logout, AGENTS.md sección 89/91):
 * evita que la siguiente cuenta en el mismo dispositivo reciba, aunque sea
 * por un instante, un asset privado (foto de perfil, etc.) de la cuenta
 * anterior. Limpia tanto el esquema actual (`private-asset-v2-`) como el
 * `.bin` heredado, por si quedó algo cacheado de antes del cambio de
 * versión. Sin dependencia de ningún store: puede llamarse desde
 * `authStore` sin crear un import circular con `usePrivateAsset`.
 */
export function clearPrivateAssetCache(userId: number | string): void {
  // `mrlana-doc-`: copias temporales de documentos (visor/descarga) que un
  // cierre abrupto de la app pudo dejar en caché — nunca sobreviven al logout.
  const prefijos = [`private-asset-v2-${userId}-`, `private-asset-${userId}-`, PREFIJO_TEMPORAL_DOCUMENTO];
  try {
    for (const entry of Paths.cache.list()) {
      if (entry instanceof File && prefijos.some((prefijo) => entry.name.startsWith(prefijo))) {
        try {
          entry.delete();
        } catch {
          // no crítico
        }
      }
    }
  } catch {
    // no crítico: si el listado falla, el sistema operativo limpia Paths.cache eventualmente.
  }
}
