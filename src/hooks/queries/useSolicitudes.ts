import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { solicitudesApi } from '@/api/solicitudes';
import { queryKeys, rhQueryKeyPrefix } from '@/api/queryKeys';
import type { CreateSolicitudPayload } from '@/types/request';

/**
 * Todo lo que una mutación de solicitudes puede haber movido: el listado
 * propio (y su versión infinita), el detalle, el dashboard, el saldo de
 * vacaciones (una vacación unificada descuenta del mismo saldo), el
 * bootstrap (contadores/badges) y las notificaciones.
 */
function invalidateSolicitudes(queryClient: QueryClient, id?: string | number): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.solicitudes });
  if (id !== undefined) void queryClient.invalidateQueries({ queryKey: queryKeys.solicitud(id) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  void queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap });
  void queryClient.invalidateQueries({ queryKey: queryKeys.vacacionesSaldo });
  void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
}

/** Solo primera página — usada donde basta una lectura rápida (badge del tab Solicitudes). */
export function useSolicitudes() {
  return useQuery({
    queryKey: queryKeys.solicitudes,
    queryFn: solicitudesApi.getAll,
  });
}

/**
 * Scroll infinito real sobre `GET /solicitudes` — un colaborador con más
 * solicitudes que el tamaño de página de Laravel debe poder verlas todas.
 * También es la fuente de "Mis vacaciones" (se filtra por `tipo`).
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

export function useCreateSolicitud() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSolicitudPayload) => solicitudesApi.create(payload),
    onSuccess: () => invalidateSolicitudes(queryClient),
    /**
     * Sin reintento automático: un POST que no confirmó puede haberse
     * aplicado igual en el servidor, y reintentarlo crearía una solicitud
     * duplicada (sección 42/43 del encargo). Quien llama decide qué decirle
     * al usuario.
     */
    retry: false,
  });
}

/**
 * `POST /api/v1/solicitudes/{id}/cancelar`. Acción destructiva: la pantalla
 * debe confirmar antes. Tras cancelar se refresca todo lo que la solicitud
 * tocaba — nunca se espera a que llegue un push propio (sección 41).
 */
export function useCancelSolicitud() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => solicitudesApi.cancelar(id),
    onSuccess: (_result, id) => {
      invalidateSolicitudes(queryClient, id);
      // Si quien cancela también es RH, su bandeja acaba de cambiar.
      void queryClient.invalidateQueries({ queryKey: rhQueryKeyPrefix });
    },
    retry: false,
  });
}
