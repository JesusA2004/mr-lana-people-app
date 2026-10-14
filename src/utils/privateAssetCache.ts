import { File, Paths } from 'expo-file-system';

/** Hash corto y estable (no criptográfico, no necesita serlo) para construir un nombre de archivo determinista por URL. */
export function hashForCacheName(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function privateAssetCacheFileName(userId: number | string, remoteUrl: string): string {
  return `private-asset-${userId}-${hashForCacheName(remoteUrl)}.bin`;
}

/**
 * Borra todo lo cacheado de este usuario (logout, AGENTS.md sección 89/91):
 * evita que la siguiente cuenta en el mismo dispositivo reciba, aunque sea
 * por un instante, un asset privado (foto de perfil, etc.) de la cuenta
 * anterior. Sin dependencia de ningún store: puede llamarse desde
 * `authStore` sin crear un import circular con `usePrivateAsset`.
 */
export function clearPrivateAssetCache(userId: number | string): void {
  const prefix = `private-asset-${userId}-`;
  try {
    for (const entry of Paths.cache.list()) {
      if (entry instanceof File && entry.name.startsWith(prefix)) {
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
