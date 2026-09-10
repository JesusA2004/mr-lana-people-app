import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { documentosLaboralesApi, type DocumentosLaboralesParams } from '@/api/documentosLaborales';
import { queryKeys } from '@/api/queryKeys';

export function useLaborDocumentsInfinite(params: Omit<DocumentosLaboralesParams, 'page'>, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.laborDocuments(params as Record<string, unknown>),
    queryFn: ({ pageParam }) => documentosLaboralesApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const { meta } = lastPage;
      if (!meta?.last_page) return undefined;
      const nextPage = allPages.length + 1;
      return nextPage <= meta.last_page ? nextPage : undefined;
    },
    enabled,
  });
}

/** Solo para la card del Home (sección 22) — primera página, sin infinite scroll. */
export function useLaborDocumentsSummary(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.laborDocuments({ per_page: 5 }),
    queryFn: () => documentosLaboralesApi.list({ page: 1 }),
    enabled,
    staleTime: 60_000,
  });
}
