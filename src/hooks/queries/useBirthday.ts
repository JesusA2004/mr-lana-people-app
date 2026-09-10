import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { apiClient } from '@/api/client';
import { cumpleanosApi } from '@/api/cumpleanos';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/store/authStore';
import { logError } from '@/utils/errors';

/** `null` = hoy no es cumpleaños del colaborador autenticado (404 real, no un error). */
export function useBirthdayGreeting(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.cumpleanosFelicitacionActual,
    queryFn: cumpleanosApi.getFelicitacionActual,
    enabled,
    staleTime: 5 * 60_000,
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Descarga la imagen de felicitación como `data:` URI usando el Bearer
 * token de la sesión (streaming autenticado, `GET
 * /colaborador/cumpleanos/felicitacion-actual/imagen`) — un `<Image
 * source={{ uri }}>` normal no puede mandar el header Authorization en
 * todos los casos de caché nativo, así que se resuelve a base64 una sola
 * vez y se reutiliza mientras el componente esté montado.
 */
export function useBirthdayImage(enabled: boolean) {
  const token = useAuthStore((state) => state.token);
  const [uri, setUri] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;

    // Todo el `setState` se difiere a un callback (nunca directo en el
    // cuerpo del efecto) para no encadenar renders síncronos.
    const timer = setTimeout(() => {
      if (cancelled) return;

      if (!enabled || !token) {
        setStatus('idle');
        setUri(null);
        return;
      }

      setStatus('loading');
      void (async () => {
        try {
          const response = await apiClient.get(cumpleanosApi.imagenPath(), {
            responseType: 'arraybuffer',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (cancelled) return;
          const contentType = (response.headers?.['content-type'] as string | undefined) ?? 'image/jpeg';
          const base64 = arrayBufferToBase64(response.data as ArrayBuffer);
          setUri(`data:${contentType};base64,${base64}`);
          setStatus('ready');
        } catch (error) {
          if (cancelled) return;
          logError('useBirthdayImage', error);
          setStatus('error');
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, token]);

  return { uri, status };
}
