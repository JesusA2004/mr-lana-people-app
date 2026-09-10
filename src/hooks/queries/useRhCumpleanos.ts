import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { rhCumpleanosApi, type RhCumpleanosParams } from '@/api/rh/cumpleanos';

/** Bandeja de cumpleaños RH — paginación real (mismo patrón que `useRhPendientesInfinite`). */
export function useRhCumpleanosInfinite(params: Omit<RhCumpleanosParams, 'page'>, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.rhCumpleanos(params as Record<string, unknown>),
    queryFn: ({ pageParam }) => rhCumpleanosApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { meta } = lastPage;
      const lastPageNumber = Math.ceil(meta.total / meta.per_page) || 1;
      return meta.current_page < lastPageNumber ? meta.current_page + 1 : undefined;
    },
    enabled,
  });
}

export function useRhCumpleano(greetingId: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhCumpleano(greetingId ?? ''),
    queryFn: () => rhCumpleanosApi.getById(greetingId as string | number),
    enabled: Boolean(greetingId),
  });
}

export function useRhCumpleanoEnviar(greetingId: string | number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rhCumpleanosApi.enviar(greetingId as string | number),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.rhCumpleano(greetingId ?? '') }),
  });
}
