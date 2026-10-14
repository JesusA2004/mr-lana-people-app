import { File, Paths } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';

import { useAuthStore } from '@/store/authStore';
import { privateAssetCacheFileName } from '@/utils/privateAssetCache';

export type PrivateAssetStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PrivateAssetState {
  status: PrivateAssetStatus;
  /** `file://...` local, listo para `<Image source={{ uri }} />` — nunca la URL remota con el Bearer en los headers. */
  uri: string | null;
  reload: () => void;
}

/**
 * Descarga un asset privado (Bearer) a caché local y devuelve una `file://`
 * lista para pintarse — nunca pasa el token como header de `<Image>` (eso es
 * justo lo que fallaba en dispositivo real: AGENTS.md sección 32-34 del
 * encargo móvil). El nombre de archivo es DETERMINISTA por (usuario, URL):
 * mismo usuario + misma URL ⇒ mismo archivo, así que una foto ya
 * descargada se reutiliza sin bajar de nuevo en cada render/montaje. La
 * URL ya trae su propio `?v=` de versión (backend), así que una foto nueva
 * cambia la URL y por tanto siempre baja un archivo distinto — nunca sirve
 * una copia vieja.
 *
 * Namespaced por `userId` (sección 89): `clearPrivateAssetCache()`
 * (`@/utils/privateAssetCache`) se llama en logout para que la siguiente
 * cuenta en el mismo dispositivo nunca vea sobras de la anterior.
 */
export function usePrivateAsset(remoteUrl: string | null | undefined): PrivateAssetState {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const habilitado = Boolean(remoteUrl && token && userId !== null);
  const [status, setStatus] = useState<PrivateAssetStatus>(habilitado ? 'loading' : 'idle');
  const [uri, setUri] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    // Sin URL/sesión: no hay nada que descargar — se deja el estado tal
    // cual (el consumidor ya ignora status/uri cuando no está habilitado,
    // ver Avatar.tsx) en vez de "resetear" con un setState síncrono aquí.
    if (!remoteUrl || !token || userId === null) {
      return;
    }

    const destino = new File(Paths.cache, privateAssetCacheFileName(userId, remoteUrl));
    const controller = new AbortController();

    (async () => {
      if (destino.exists && destino.size !== 0) {
        setStatus('ready');
        setUri(destino.uri);
        return;
      }

      setStatus('loading');
      try {
        const task = File.createDownloadTask(remoteUrl, destino, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const downloaded = await task.downloadAsync();
        if (cancelledRef.current) return;
        if (!downloaded || downloaded.size === 0) throw new Error('Archivo vacío');
        setStatus('ready');
        setUri(downloaded.uri);
      } catch {
        if (cancelledRef.current) return;
        try {
          destino.delete();
        } catch {
          // no crítico
        }
        setStatus('error');
        setUri(null);
      }
    })();

    return () => {
      cancelledRef.current = true;
      controller.abort();
    };
  }, [remoteUrl, token, userId, reloadTick]);

  return { status, uri, reload: () => setReloadTick((t) => t + 1) };
}
