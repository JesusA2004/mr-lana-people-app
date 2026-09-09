import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { solicitudesApi } from '@/api/solicitudes';
import { queryKeys } from '@/api/queryKeys';
import type { CreateSolicitudPayload } from '@/types/request';

/** Solo primera página — usada donde basta una lectura rápida (badge del tab Solicitudes). */
export function useSolicitudes() {
  return useQuery({
    queryKey: queryKeys.solicitudes,
    queryFn: solicitudesApi.getAll,
  });
}

/**
 * Scroll infinito real sobre `GET /solicitudes` (V4 sección 105: "usuarios
 * con muchas solicitudes" no deben quedarse solo con la primera página de
 * Laravel). Usada por la pantalla de listado; el badge del tab sigue en
 * `useSolicitudes()` porque solo necesita una cuenta aproximada rápida, no
 * cargar todas las páginas.
 */
export function useSolicitudesInfinite() {
  return useInfiniteQuery({
    queryKey: [...queryKeys.solicitudes, 'infinite'],
    queryFn: ({ pageParam }) => solicitudesApi.getPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      if (!meta?.current_page || !meta.last_page) return undefined;
      return meta.current_page < meta.last_page ? meta.current_page + 1 : undefined;
    },
  });
}

export function useSolicitud(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.solicitud(id ?? ''),
    queryFn: () => solicitudesApi.getById(id as string | number),
    enabled: Boolean(id),
  });
}

/** Crear solicitud invalida el listado, el dashboard (solicitudes recientes) y notificaciones ("Solicitud recibida"). */
export function useCreateSolicitud() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSolicitudPayload) => solicitudesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.solicitudes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    },
  });
}
