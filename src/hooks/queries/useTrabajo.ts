import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { equipoApi, evaluacionesApi, tareasApi, type TareasParams } from '@/api/trabajo';
import type { AutorizarEvaluacionPayload, CapturarEvaluacionPayload } from '@/types/evaluation';
import { nextPageOf } from '@/utils/normalize';
import { invalidateCiclo } from './cicloInvalidate';
import { retryUnlessClientError, SENSITIVE_MUTATION } from './queryOptions';

// ------------------------------------------------------------ Mi equipo

export function useEquipo(enabled = true) {
  return useQuery({ queryKey: queryKeys.equipo, queryFn: equipoApi.list, enabled, retry: retryUnlessClientError, staleTime: 5 * 60_000 });
}

export function useEquipoPendientes(enabled = true) {
  return useQuery({ queryKey: queryKeys.equipoPendientes, queryFn: equipoApi.pendientes, enabled, retry: retryUnlessClientError });
}

export function useVistoBueno() {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: ({ solicitudId, aprobado, comentario }: { solicitudId: number; aprobado: boolean; comentario?: string | null }) =>
      equipoApi.vistoBueno(solicitudId, aprobado, comentario),
    onSuccess: (_result, { solicitudId }) => invalidateCiclo(queryClient, { type: 'visto_bueno', solicitudId }),
  });
}

// ------------------------------------------------------------ Evaluaciones

export function useEvaluaciones(estado: string | undefined, enabled = true) {
  const params = estado ? { estado } : {};
  return useInfiniteQuery({
    queryKey: queryKeys.evaluacionesList(params),
    queryFn: ({ pageParam }) => evaluacionesApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    retry: retryUnlessClientError,
  });
}

export function useEvaluacion(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.evaluacion(id ?? ''),
    queryFn: () => evaluacionesApi.get(id as string | number),
    enabled: id !== undefined && id !== '',
    retry: retryUnlessClientError,
  });
}

export function useCapturarEvaluacion(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: (payload: CapturarEvaluacionPayload) => evaluacionesApi.capturar(id, payload),
    onSuccess: (evaluacion) => {
      queryClient.setQueryData(queryKeys.evaluacion(id), evaluacion);
      invalidateCiclo(queryClient, { type: 'evaluacion_capturada', evaluacionId: id });
    },
  });
}

export function useAutorizarEvaluacion(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: (payload: AutorizarEvaluacionPayload) => evaluacionesApi.autorizar(id, payload),
    onSuccess: (evaluacion) => {
      queryClient.setQueryData(queryKeys.evaluacion(id), evaluacion);
      invalidateCiclo(queryClient, { type: 'evaluacion_autorizada', evaluacionId: id });
    },
  });
}

export function useDevolverEvaluacion(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: (motivo: string) => evaluacionesApi.devolver(id, motivo),
    onSuccess: (evaluacion) => {
      queryClient.setQueryData(queryKeys.evaluacion(id), evaluacion);
      invalidateCiclo(queryClient, { type: 'evaluacion_devuelta', evaluacionId: id });
    },
  });
}

// ------------------------------------------------------------ Tareas

export function useTareas(params: Omit<TareasParams, 'page'> = {}, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.tareasList(params as Record<string, unknown>),
    queryFn: ({ pageParam }) => tareasApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    retry: retryUnlessClientError,
  });
}

/** Conteos para badges/cards: una página mínima (`per_page=1`), los conteos vienen en `meta.conteos`. */
export function useTareasConteos(enabled = true) {
  return useQuery({
    queryKey: queryKeys.tareasList({ resumen: true }),
    queryFn: async () => (await tareasApi.list({ estado: 'abiertas', per_page: 1 })).conteos,
    enabled,
    retry: retryUnlessClientError,
    staleTime: 30_000,
  });
}

export function useLeerTarea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tareasApi.leer(id),
    onSuccess: () => invalidateCiclo(queryClient, { type: 'tarea_actualizada' }),
  });
}

export function useResolverTarea() {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: (id: number) => tareasApi.resolver(id),
    onSuccess: () => invalidateCiclo(queryClient, { type: 'tarea_actualizada' }),
  });
}
