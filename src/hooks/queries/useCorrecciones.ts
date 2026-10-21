import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { correccionesApi } from '@/api/correcciones';
import { queryKeys } from '@/api/queryKeys';
import { solicitudesApi } from '@/api/solicitudes';
import { useRefrescarAlVolver } from '@/hooks/useRefrescarAlVolver';
import type { ResponderCorreccionPayload } from '@/types/correcciones';
import { retryUnlessClientError, SENSITIVE_MUTATION } from './queryOptions';

/** `GET /correcciones` — lista con estado, comentario de RH e historial. */
export function useCorrecciones(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.correcciones,
    queryFn: correccionesApi.list,
    enabled,
    retry: retryUnlessClientError,
    staleTime: 20_000,
  });
  useRefrescarAlVolver(() => void query.refetch(), enabled);
  return query;
}

/** Préstamos: elegibilidad con la fecha del servidor (nunca la del teléfono). */
export function usePrestamoElegibilidad(enabled = true) {
  return useQuery({
    queryKey: queryKeys.prestamoElegibilidad,
    queryFn: solicitudesApi.getElegibilidadPrestamo,
    enabled,
    retry: retryUnlessClientError,
    staleTime: 60_000,
  });
}

/** `POST /solicitudes/{id}/responder` — la corrección vuelve a «Enviada» para RH. */
export function useResponderCorreccion(solicitudId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: (payload: ResponderCorreccionPayload) => correccionesApi.responder(solicitudId as number, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.correcciones });
      if (solicitudId !== null) void queryClient.invalidateQueries({ queryKey: queryKeys.solicitud(solicitudId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tareas });
    },
  });
}
