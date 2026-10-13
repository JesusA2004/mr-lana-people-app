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
/** El PDF oficial de la inducción (título, ruta, páginas). */
export function usePresentacionInduccion(enabled = true) {
  return useQuery({
    queryKey: queryKeys.induccionPresentacion,
    queryFn: induccionApi.presentacion,
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: retryUnlessClientError,
  });
}

/**
 * Registra una página MOSTRADA en el servidor y actualiza el resumen de
 * mi-proceso con lo que responde el backend (nunca un cálculo local).
 */
export function useRegistrarPaginaInduccion(avanceId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pagina: number) => induccionApi.registrarPagina(avanceId as number, pagina),
    onSuccess: (resumen) => {
      if (resumen) {
        queryClient.setQueryData<MiProceso>(queryKeys.miProceso, (prev) => (prev ? { ...prev, induccion: resumen } : prev));
      }
    },
  });
}

/** «Terminé la inducción» → habilita la evaluación (si corresponde). */
export function useTerminarInduccion(avanceId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => induccionApi.terminar(avanceId as number),
    onSuccess: ({ resumen, evaluacion }) => {
      queryClient.setQueryData<MiProceso>(queryKeys.miProceso, (prev) =>
        prev ? { ...prev, ...(resumen ? { induccion: resumen } : {}), ...(evaluacion ? { evaluacionInduccion: evaluacion } : {}) } : prev,
      );
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
