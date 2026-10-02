import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { rhReingresosApi } from '@/api/rh/reingresos';
import type { SolicitarReingresoPayload } from '@/types/rhReingreso';
import { nextPageOf } from '@/utils/normalize';
import { invalidateCiclo } from './cicloInvalidate';
import { retryUnlessClientError, SENSITIVE_MUTATION } from './queryOptions';

export function useRhReingresos(estado: string | undefined, enabled = true) {
  const params = estado ? { estado } : {};
  return useInfiniteQuery({
    queryKey: queryKeys.rhReingresosList(params),
    queryFn: ({ pageParam }) => rhReingresosApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    retry: retryUnlessClientError,
  });
}

export function useRhReingresoBuscar(q: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhReingresosBuscar(q),
    queryFn: () => rhReingresosApi.buscar(q),
    enabled: enabled && q.trim().length >= 3,
    retry: retryUnlessClientError,
  });
}

export function useRhReingresoHistorial(colaboradorId: number | string | undefined) {
  return useQuery({
    queryKey: queryKeys.rhReingresoHistorial(colaboradorId ?? ''),
    queryFn: () => rhReingresosApi.historial(colaboradorId as number | string),
    enabled: colaboradorId !== undefined,
    retry: retryUnlessClientError,
  });
}

export function useRhSolicitarReingreso() {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: ({ colaboradorId, payload }: { colaboradorId: number | string; payload: SolicitarReingresoPayload }) => rhReingresosApi.solicitar(colaboradorId, payload),
    onSuccess: (reingreso) => invalidateCiclo(queryClient, { type: 'rh_reingreso', reingresoId: reingreso.id, colaboradorId: reingreso.colaborador?.id }),
  });
}

export function useRhDecidirReingreso() {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: ({ id, viable, comentario }: { id: number | string; viable: boolean; comentario?: string | null }) => rhReingresosApi.decidir(id, viable, comentario),
    onSuccess: (reingreso) => invalidateCiclo(queryClient, { type: 'rh_reingreso', reingresoId: reingreso.id, colaboradorId: reingreso.colaborador?.id }),
  });
}
