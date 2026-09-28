import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { celebracionesApi } from '@/api/celebraciones';
import { queryKeys } from '@/api/queryKeys';
import type { LocalUploadFile } from '@/api/upload';
import { nextPageFromMeta } from './useBirthdayWall';

/** Todo lo que el colaborador autenticado puede celebrar hoy (cumpleaños Y aniversarios, mismo endpoint). */
export function useCelebracionesActivas(enabled = true) {
  return useQuery({ queryKey: queryKeys.celebracionesActivas, queryFn: celebracionesApi.activas, enabled, staleTime: 5 * 60_000 });
}

export function useCelebracion(id: number | string | undefined) {
  return useQuery({
    queryKey: queryKeys.celebracion(id ?? ''),
    queryFn: () => celebracionesApi.getById(id as number | string),
    enabled: Boolean(id),
  });
}

export function useCelebracionMensajes(id: number | string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.celebracionMensajes(id ?? ''),
    queryFn: ({ pageParam }) => celebracionesApi.mensajes(id as number | string, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPageFromMeta,
    enabled: Boolean(id),
  });
}

function useInvalidateCelebracion(id: number | string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.celebracion(id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.celebracionMensajes(id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.celebracionesActivas });
  };
}

/** Un mensaje por persona: 422 si ya escribió el suyo (`puede_escribir` ya lo oculta en la UI). */
export function usePublicarMensajeCelebracion(id: number | string) {
  const invalidate = useInvalidateCelebracion(id);
  return useMutation({
    mutationFn: (payload: { mensaje?: string; foto?: LocalUploadFile | null }) => celebracionesApi.publicarMensaje(id, payload),
    onSuccess: invalidate,
    retry: false,
  });
}

export function useEliminarMensajeCelebracion(id: number | string) {
  const invalidate = useInvalidateCelebracion(id);
  return useMutation({
    mutationFn: (mensajeId: number | string) => celebracionesApi.eliminarMensaje(id, mensajeId),
    onSuccess: invalidate,
    retry: false,
  });
}
