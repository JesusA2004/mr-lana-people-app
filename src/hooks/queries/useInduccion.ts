import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { induccionApi } from '@/api/induccion';
import { queryKeys } from '@/api/queryKeys';
import type { MiProceso } from '@/types/miProceso';
import type { OpinionInduccion, RespuestasInduccion } from '@/types/induccion';
import { retryUnlessClientError } from './queryOptions';

/**
 * Inducción Mr. Lana. El estado (resumen, evaluación, reintento) SIEMPRE
 * sale de `mi-proceso` (backend); estas consultas solo traen el contenido.
 */
export function useCapitulosInduccion(avanceId: number | null) {
  return useQuery({
    queryKey: queryKeys.induccionCapitulos(avanceId ?? 0),
    queryFn: () => induccionApi.capitulos(avanceId as number),
    enabled: avanceId !== null && avanceId > 0,
    retry: retryUnlessClientError,
  });
}

export function usePresentacionInduccion(enabled = true) {
  return useQuery({ queryKey: queryKeys.induccionPresentacion, queryFn: induccionApi.presentacion, enabled, retry: retryUnlessClientError });
}

/** Organigrama vigente de una vista; cacheado (la estructura cambia poco). */
export function useOrganigramaInduccion(vista: string) {
  return useQuery({
    queryKey: queryKeys.induccionOrganigrama(vista),
    queryFn: () => induccionApi.organigrama(vista),
    staleTime: 5 * 60 * 1000,
    retry: retryUnlessClientError,
  });
}

/**
 * Registra un capítulo visto en el servidor y actualiza el resumen de
 * mi-proceso con lo que responde el backend (nunca un cálculo local).
 */
export function useRegistrarCapitulo(avanceId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (capitulo: string) => induccionApi.registrarProgreso(avanceId as number, capitulo),
    onSuccess: (resumen) => {
      if (resumen) {
        queryClient.setQueryData<MiProceso>(queryKeys.miProceso, (prev) => (prev ? { ...prev, induccion: resumen } : prev));
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.miProceso });
    },
  });
}

export function useContenidoEvaluacionInduccion(enabled = true) {
  return useQuery({
    queryKey: queryKeys.induccionEvaluacionContenido,
    queryFn: induccionApi.contenidoEvaluacion,
    enabled,
    retry: retryUnlessClientError,
  });
}

export function usePresentarEvaluacionInduccion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ evaluacionId, respuestas, opinion }: { evaluacionId: number; respuestas: RespuestasInduccion; opinion: OpinionInduccion | null }) =>
      induccionApi.presentar(evaluacionId, respuestas, opinion),
    onSuccess: (evaluacion) => {
      if (evaluacion) {
        queryClient.setQueryData<MiProceso>(queryKeys.miProceso, (prev) => (prev ? { ...prev, evaluacionInduccion: evaluacion } : prev));
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.miProceso });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    },
  });
}
