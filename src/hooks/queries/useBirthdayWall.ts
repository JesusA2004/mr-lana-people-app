import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { birthdayWallApi } from '@/api/birthdayWall';
import type { LocalUploadFile } from '@/api/upload';
import type { PaginatedResponse } from '@/types/api';
import { retryUnlessClientError, SENSITIVE_MUTATION } from './queryOptions';

export const birthdayWallKeys = {
  root: ['cumpleanos', 'muros'] as const,
  list: ['cumpleanos', 'muros', 'lista'] as const,
  detail: (id: number | string) => ['cumpleanos', 'muros', String(id)] as const,
  mensajes: (id: number | string) => ['cumpleanos', 'muros', String(id), 'mensajes'] as const,
};

/** `getNextPageParam` tolerante a `meta` ausente. */
export function nextPageFromMeta(page: PaginatedResponse<unknown>): number | undefined {
  const current = page.meta?.current_page;
  const last = page.meta?.last_page;
  return current !== undefined && last !== undefined && current < last ? current + 1 : undefined;
}

export function useBirthdayWalls(enabled = true) {
  return useQuery({ queryKey: birthdayWallKeys.list, queryFn: birthdayWallApi.list, enabled, retry: retryUnlessClientError, staleTime: 60_000 });
}

export function useBirthdayWall(id: number | string | undefined) {
  return useQuery({
    queryKey: birthdayWallKeys.detail(id ?? ''),
    queryFn: () => birthdayWallApi.get(id as string),
    enabled: Boolean(id),
    retry: retryUnlessClientError,
  });
}

export function useBirthdayWallMessages(id: number | string | undefined) {
  return useInfiniteQuery({
    queryKey: birthdayWallKeys.mensajes(id ?? ''),
    queryFn: ({ pageParam }) => birthdayWallApi.mensajes(id as string, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPageFromMeta,
    enabled: Boolean(id),
    retry: retryUnlessClientError,
  });
}

function useInvalidateWall(id: number | string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: birthdayWallKeys.root });
    void queryClient.invalidateQueries({ queryKey: ['rh', 'cumpleanos'] });
    void queryClient.invalidateQueries({ queryKey: birthdayWallKeys.detail(id) });
  };
}

export function usePublicarEnMuro(id: number | string) {
  const invalidate = useInvalidateWall(id);
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: (payload: { mensaje: string; foto: LocalUploadFile | null }) => birthdayWallApi.publicar(id, payload),
    onSuccess: invalidate,
  });
}

export function useEliminarMensajeMuro(id: number | string) {
  const invalidate = useInvalidateWall(id);
  return useMutation({ ...SENSITIVE_MUTATION, mutationFn: (mensajeId: number) => birthdayWallApi.eliminar(id, mensajeId), onSuccess: invalidate });
}

export function useGestionarMuro(greetingId: number | string) {
  const invalidate = useInvalidateWall(greetingId);
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: (accion: 'abrir' | 'cerrar') => (accion === 'abrir' ? birthdayWallApi.abrir(greetingId) : birthdayWallApi.cerrar(greetingId)),
    onSuccess: invalidate,
  });
}
