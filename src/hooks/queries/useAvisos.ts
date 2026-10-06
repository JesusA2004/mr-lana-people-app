import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { avisosApi } from '@/api/avisos';
import { queryKeys } from '@/api/queryKeys';
import { nextPageFromMeta } from './useBirthdayWall';

/**
 * Bandeja de avisos de RH (mensaje + imagen, a toda la empresa o a este
 * colaborador) — `GET /avisos`. `items` ya viene aplanado (todas las
 * páginas cargadas juntas), mismo patrón que `useNotificaciones`.
 */
export function useAvisos() {
  const query = useInfiniteQuery({
    queryKey: queryKeys.avisos,
    queryFn: ({ pageParam }) => avisosApi.getPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPageFromMeta,
    staleTime: 30_000,
  });

  const items = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  const unreadCount = useMemo(() => items.filter((item) => !item.leido).length, [items]);

  return { ...query, items, unreadCount };
}

/** Al ABRIR un aviso (nunca antes de que el colaborador lo abra) — `POST /avisos/{id}/leido`. */
export function useMarcarAvisoLeido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => avisosApi.marcarLeido(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.avisos });
    },
  });
}
