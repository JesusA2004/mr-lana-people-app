import { useQuery } from '@tanstack/react-query';

import { cumpleanosApi } from '@/api/cumpleanos';
import { queryKeys } from '@/api/queryKeys';
import { API_URL } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';

/** `null` = hoy no es cumpleaños del colaborador autenticado (404 real, no un error). */
export function useBirthdayGreeting(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.cumpleanosFelicitacionActual,
    queryFn: cumpleanosApi.getFelicitacionActual,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export interface BirthdayImageSource {
  uri: string;
  headers: Record<string, string>;
}

/**
 * Fuente autenticada de la imagen de felicitación para `<Image>` de
 * expo-image (AGENTS.md sección 33/corrección de bug real): expo-image
 * ~57 soporta `headers` en `source` para pedir imágenes remotas con
 * Authorization Bearer de forma nativa — ya no se descarga a mano con
 * `responseType: 'arraybuffer'` ni se convierte byte a byte a base64 en JS
 * (esa conversión sí generaba un pico de memoria real con una imagen
 * 1080x1350, además de duplicar el archivo completo dos veces en memoria:
 * el `ArrayBuffer` y el string base64 resultante). No se descarga ningún
 * archivo temporal ni se persiste nada — el token nunca viaja en la URL,
 * solo en el header, y no hay nada que limpiar al cerrar sesión.
 */
export function useBirthdayImageSource(enabled: boolean): BirthdayImageSource | null {
  const token = useAuthStore((state) => state.token);
  if (!enabled || !token) return null;
  return { uri: `${API_URL}${cumpleanosApi.imagenPath()}`, headers: { Authorization: `Bearer ${token}` } };
}
