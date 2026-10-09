import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cicloLaboralApi, prestamosApi, recibosApi } from '@/api/cicloLaboral';
import { queryKeys } from '@/api/queryKeys';
import { nextPageOf } from '@/utils/normalize';
import { retryUnlessClientError } from './queryOptions';

/**
 * Autoservicio del ciclo laboral (backend 2026-09-22). Todas toleran 404
 * (cuenta sin colaborador vinculado) sin reintentar: la pantalla muestra
 * "sin información", nunca un error genérico.
 */

/**
 * "Lo que necesitas hacer" — fuente ÚNICA del estado del ciclo del
 * colaborador. Úsalo para decidir qué mostrar; los demás hooks solo dan
 * detalle (documentos, recibos…).
 */
export function useMiProceso(enabled = true) {
  return useQuery({ queryKey: queryKeys.miProceso, queryFn: cicloLaboralApi.miProceso, enabled, retry: retryUnlessClientError });
}

/** Presenta una lección; al terminar refresca mi-proceso (y el bootstrap, por los avisos). */
export function usePresentarLeccion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ avanceId, respuestas }: { avanceId: number; respuestas: Record<number, number> }) =>
      cicloLaboralApi.presentarLeccion(avanceId, respuestas),
    onSuccess: (resultado) => {
      if (resultado.proceso) {
        queryClient.setQueryData(queryKeys.miProceso, resultado.proceso);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.miProceso });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    },
  });
}

export function useMiAlta(enabled = true) {
  return useQuery({ queryKey: queryKeys.miAlta, queryFn: cicloLaboralApi.alta, enabled, retry: retryUnlessClientError });
}

export function useMiExpediente(enabled = true) {
  return useQuery({ queryKey: queryKeys.miExpediente, queryFn: cicloLaboralApi.expediente, enabled, retry: retryUnlessClientError });
}

export function useDocumentosPendientes(enabled = true) {
  return useQuery({
    queryKey: queryKeys.documentosPendientes,
    queryFn: cicloLaboralApi.documentosPendientes,
    enabled,
    retry: retryUnlessClientError,
  });
}

export function useMisContratos(enabled = true) {
  return useQuery({ queryKey: queryKeys.misContratos, queryFn: cicloLaboralApi.contratos, enabled, retry: retryUnlessClientError });
}

export function useMiJerarquia(enabled = true) {
  return useQuery({
    queryKey: queryKeys.miJerarquia,
    queryFn: cicloLaboralApi.jerarquia,
    enabled,
    retry: retryUnlessClientError,
    staleTime: 5 * 60_000,
  });
}

export function useMisRecibos(enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.misRecibos,
    queryFn: ({ pageParam }) => recibosApi.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    retry: retryUnlessClientError,
  });
}

/** «Completa tu información»: datos personales que faltan en el expediente. */
export function useDatosFaltantes(enabled = true) {
  return useQuery({ queryKey: queryKeys.datosFaltantes, queryFn: cicloLaboralApi.datosFaltantes, enabled, retry: retryUnlessClientError });
}

export function useMiRecibo(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.miRecibo(id ?? ''),
    queryFn: () => recibosApi.get(id as string | number),
    enabled: id !== undefined && id !== '',
    retry: retryUnlessClientError,
  });
}

export function useMisPrestamos(enabled = true) {
  return useQuery({ queryKey: queryKeys.misPrestamos, queryFn: prestamosApi.list, enabled, retry: retryUnlessClientError });
}

export function useMiPrestamo(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.miPrestamo(id ?? ''),
    queryFn: () => prestamosApi.get(id as string | number),
    enabled: id !== undefined && id !== '',
    retry: retryUnlessClientError,
  });
}
