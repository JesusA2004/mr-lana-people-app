import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { solicitudesApi } from '@/api/solicitudes';
import { queryKeys } from '@/api/queryKeys';
import type { CreateSolicitudPayload } from '@/types/request';

export function useSolicitudes() {
  return useQuery({
    queryKey: queryKeys.solicitudes,
    queryFn: solicitudesApi.getAll,
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
