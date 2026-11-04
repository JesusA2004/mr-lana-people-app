import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { rhRecepcionApi, type FiltrosRenglones } from '@/api/rh/recepcionDocumental';
import { toast } from '@/store/toastStore';
import type { MarcarRecepcionPayload, RenglonRecepcion } from '@/types/recepcionDocumental';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';
import { nextPageOf, type Paginated } from '@/utils/normalize';
import { aplicarEstadoOptimista, reemplazarRenglon } from '@/utils/recepcionDocumental';
import { retryUnlessClientError } from './queryOptions';

/** Cortes (periodos mensuales) con métricas en el alcance del usuario. */
export function useRhRecepcionCortes(enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.rhRecepcionCortes,
    queryFn: ({ pageParam }) => rhRecepcionApi.cortes(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    retry: retryUnlessClientError,
  });
}

/** Resumen del corte: métricas, sucursales (con pendientes primero), reglas y permisos. */
export function useRhRecepcionCorte(corteId: number | null) {
  return useQuery({
    queryKey: queryKeys.rhRecepcionCorte(corteId ?? ''),
    queryFn: () => rhRecepcionApi.corte(corteId as number),
    enabled: corteId !== null,
    retry: retryUnlessClientError,
  });
}

/** Renglones de una sucursal del corte, 50 por página (orden del backend: evento → persona → documento). */
export function useRhRecepcionRenglones(corteId: number | null, filtros: FiltrosRenglones, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.rhRecepcionRenglones(corteId ?? '', { ...filtros }),
    queryFn: ({ pageParam }) => rhRecepcionApi.renglones(corteId as number, filtros, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled: enabled && corteId !== null,
    retry: retryUnlessClientError,
  });
}

type PaginasRenglones = InfiniteData<Paginated<RenglonRecepcion>>;

export interface MarcarVariables {
  renglon: RenglonRecepcion;
  payload: MarcarRecepcionPayload;
}

/**
 * Palomear/observar un renglón con cambio OPTIMISTA: la casilla cambia al
 * instante; si el backend rechaza (permiso, corte cerrado, red) se regresa
 * ESE renglón a como estaba (sin pisar otros cambios en curso) y se avisa.
 * Al confirmar, la fila del backend reemplaza a la optimista y se refrescan
 * las métricas del corte.
 */
export function useMarcarRecepcion(corteId: number, filtros: FiltrosRenglones) {
  const queryClient = useQueryClient();
  const clave = queryKeys.rhRecepcionRenglones(corteId, { ...filtros });

  return useMutation({
    mutationFn: ({ renglon, payload }: MarcarVariables) => rhRecepcionApi.marcar(renglon.id, payload),
    onMutate: async ({ renglon, payload }) => {
      await queryClient.cancelQueries({ queryKey: clave });
      queryClient.setQueryData<PaginasRenglones>(clave, (actual) => reemplazarRenglon(actual, renglon.id, (r) => aplicarEstadoOptimista(r, payload.estado, payload)));
      haptics.selection();
      return { original: renglon };
    },
    onError: (error, _variables, contexto) => {
      logError('recepcionDocumental.marcar', error);
      if (contexto?.original) {
        const original = contexto.original;
        queryClient.setQueryData<PaginasRenglones>(clave, (actual) => reemplazarRenglon(actual, original.id, () => original));
      }
      haptics.error();
      toast.error(`No se guardó «${contexto?.original.tipo_etiqueta ?? 'el documento'}». ${getActionErrorMessage(error)}`);
    },
    onSuccess: (respuesta) => {
      queryClient.setQueryData<PaginasRenglones>(clave, (actual) => reemplazarRenglon(actual, respuesta.renglon.id, () => respuesta.renglon));
      void queryClient.invalidateQueries({ queryKey: queryKeys.rhRecepcionCorte(corteId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.rhRecepcionCortes });
    },
  });
}
