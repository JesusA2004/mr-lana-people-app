import { useQuery } from '@tanstack/react-query';

import { rhColaboradoresApi, type RhColaboradoresParams } from '@/api/rh/colaboradores';
import { queryKeys } from '@/api/queryKeys';

export function useRhColaboradores(params: RhColaboradoresParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhColaboradores(params as Record<string, unknown>),
    queryFn: () => rhColaboradoresApi.list(params),
    enabled,
  });
}

export function useRhColaborador(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhColaborador(id ?? ''),
    queryFn: () => rhColaboradoresApi.getById(id as string | number),
    enabled: Boolean(id),
  });
}
