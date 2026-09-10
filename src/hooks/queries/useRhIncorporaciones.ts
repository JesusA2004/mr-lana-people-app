import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { rhIncorporacionesApi, type RhIncorporacionesParams } from '@/api/rh/incorporaciones';
import { queryKeys } from '@/api/queryKeys';
import { invalidateRhQueries } from './rhInvalidate';

export function useRhIncorporaciones(params: RhIncorporacionesParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhIncorporaciones(params as Record<string, unknown>),
    queryFn: () => rhIncorporacionesApi.list(params),
    enabled,
  });
}

export function useRhIncorporacion(colaboradorId: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhIncorporacion(colaboradorId ?? ''),
    queryFn: () => rhIncorporacionesApi.getById(colaboradorId as string | number),
    enabled: Boolean(colaboradorId),
  });
}

export function useRhIncorporacionAprobar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (colaboradorId: string | number) => rhIncorporacionesApi.aprobar(colaboradorId),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}

export function useRhIncorporacionRechazar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ colaboradorId, motivo }: { colaboradorId: string | number; motivo: string }) =>
      rhIncorporacionesApi.rechazar(colaboradorId, motivo),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}
