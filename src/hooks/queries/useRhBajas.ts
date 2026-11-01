import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { rhBajasApi } from '@/api/rh/bajas';
import { nextPageOf } from '@/utils/normalize';
import { retryUnlessClientError } from './queryOptions';

export function useRhBajas(estatus: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.rhBajasList({ estatus }),
    queryFn: ({ pageParam }) => rhBajasApi.list({ estatus, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    retry: retryUnlessClientError,
  });
}

export function useRhBaja(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhBaja(id ?? ''),
    queryFn: () => rhBajasApi.get(id as string | number),
    enabled: id !== undefined && id !== '',
    retry: retryUnlessClientError,
  });
}
