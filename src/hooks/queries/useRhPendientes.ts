import { useInfiniteQuery } from '@tanstack/react-query';

import { rhPendientesApi, type RhPendientesParams } from '@/api/rh/pendientes';
import { queryKeys } from '@/api/queryKeys';

/** Bandeja unificada con paginación real (AGENTS.md sección 7: infinite scroll/paginación). */
export function useRhPendientesInfinite(params: Omit<RhPendientesParams, 'page'>, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.rhPendientes(params as Record<string, unknown>),
    queryFn: ({ pageParam }) => rhPendientesApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { meta } = lastPage;
      const lastPageNumber = Math.ceil(meta.total / meta.per_page) || 1;
      return meta.current_page < lastPageNumber ? meta.current_page + 1 : undefined;
    },
    enabled,
  });
}
