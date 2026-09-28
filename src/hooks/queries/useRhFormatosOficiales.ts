import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import {
  rhFormatosOficialesApi,
  type PrepararFormatoOficialPayload,
  type RhFormatosOficialesGeneradosParams,
  type RhFormatosOficialesParams,
} from '@/api/rh/formatosOficiales';
import type { GenerarFormatoOficialPayload } from '@/types/formatoOficial';

/** Catálogo — `GET /rh/formatos-oficiales`, arreglo plano SIN paginar (confirmado contra el controlador real): `useQuery`, no infinita. */
export function useRhFormatosOficiales(params: RhFormatosOficialesParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhFormatosOficiales(params as Record<string, unknown>),
    queryFn: () => rhFormatosOficialesApi.list(params),
    enabled,
  });
}

export function useRhFormatoOficial(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhFormatoOficial(id ?? ''),
    queryFn: () => rhFormatosOficialesApi.getById(id as string | number),
    enabled: Boolean(id),
  });
}

/** Informativo (catálogo de variables + formatos de salida soportados) — se consulta una sola vez, sin params. */
export function useRhFormatosOficialesVariables(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhFormatosOficialesVariables,
    queryFn: () => rhFormatosOficialesApi.variables(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * `preparar`/`vista-previa` son POST que RECALCULAN según el sujeto y los
 * manuales capturados hasta ese momento — no un recurso cacheable por
 * clave fija, así que se modelan como mutaciones que el wizard dispara en
 * cada transición (elegir sujeto, volver a revisar tras llenar manuales),
 * guardando el último resultado en estado local del componente.
 */
export function useRhFormatoOficialPreparar(formatoId: string | number | undefined) {
  return useMutation({
    mutationFn: (payload: PrepararFormatoOficialPayload) => rhFormatosOficialesApi.preparar(formatoId as string | number, payload),
  });
}

export function useRhFormatoOficialVistaPrevia(formatoId: string | number | undefined) {
  return useMutation({
    mutationFn: (payload: PrepararFormatoOficialPayload) => rhFormatosOficialesApi.vistaPrevia(formatoId as string | number, payload),
  });
}

export function useRhFormatoOficialGenerar(formatoId: string | number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerarFormatoOficialPayload) => rhFormatosOficialesApi.generar(formatoId as string | number, payload),
    onSuccess: () => {
      // El detalle del formato lista sus generaciones — invalidar ambos
      // niveles (catálogo, por si "veces_generado" algún día viaja ahí, y
      // el histórico paginado) para que la nueva generación aparezca sin
      // esperar el próximo refetch natural.
      void queryClient.invalidateQueries({ queryKey: queryKeys.rhFormatosOficiales() });
      if (formatoId !== undefined) void queryClient.invalidateQueries({ queryKey: queryKeys.rhFormatoOficial(formatoId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.rhFormatosOficialesGenerados() });
    },
  });
}

/** `GET /rh/formatos-oficiales/generados` — PAGINADO de verdad: `useInfiniteQuery`, igual que `useRhVacantes`. */
export function useRhFormatosOficialesGenerados(params: RhFormatosOficialesGeneradosParams, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.rhFormatosOficialesGenerados(params as Record<string, unknown>),
    queryFn: ({ pageParam }) => rhFormatosOficialesApi.generados({ ...params, page: pageParam }),
    initialPageParam: 1,
    enabled,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      if (!meta?.current_page || !meta.last_page) return undefined;
      return meta.current_page < meta.last_page ? meta.current_page + 1 : undefined;
    },
  });
}
