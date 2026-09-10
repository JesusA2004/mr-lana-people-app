import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { rhVacacionesApi, type RhVacacionesParams } from '@/api/rh/vacaciones';
import { queryKeys } from '@/api/queryKeys';
import { invalidateRhQueries } from './rhInvalidate';

export function useRhVacaciones(params: RhVacacionesParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhVacaciones(params as Record<string, unknown>),
    queryFn: () => rhVacacionesApi.list(params),
    enabled,
  });
}

export function useRhVacacion(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhVacacion(id ?? ''),
    queryFn: () => rhVacacionesApi.getById(id as string | number),
    enabled: Boolean(id),
  });
}

export function useRhVacacionAprobar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => rhVacacionesApi.aprobar(id),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}

export function useRhVacacionRechazar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string | number; motivo: string }) => rhVacacionesApi.rechazar(id, motivo),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}
