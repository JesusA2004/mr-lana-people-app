import { useInfiniteQuery } from '@tanstack/react-query';

import { rhVacantesApi, type RhVacantesParams } from '@/api/rh/vacantes';
import { queryKeys } from '@/api/queryKeys';

/**
 * `GET /api/v1/rh/vacantes` con paginación real (sección 45): el backend
 * pagina de verdad y una organización con muchas vacantes no debe quedarse
 * viendo solo la primera página. Solo lectura — no hay mutaciones.
 */
export function useRhVacantes(params: RhVacantesParams, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.rhVacantes(params as Record<string, unknown>),
    queryFn: ({ pageParam }) => rhVacantesApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    enabled,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      if (!meta?.current_page || !meta.per_page || meta.total === undefined) return undefined;
      const lastPageNumber = Math.ceil(meta.total / meta.per_page);
      return meta.current_page < lastPageNumber ? meta.current_page + 1 : undefined;
    },
  });
}
