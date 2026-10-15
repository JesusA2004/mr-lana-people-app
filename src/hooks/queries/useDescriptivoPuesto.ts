import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { descriptivoPuestoApi } from '@/api/descriptivoPuesto';
import { queryKeys } from '@/api/queryKeys';
import type { AcuseDescriptivoPuesto } from '@/types/descriptivoPuesto';
import { retryUnlessClientError } from './queryOptions';

/** El descriptivo de puesto que RH me envió (o `null`). El estado lo decide el servidor. */
export function useMiDescriptivoPuesto(enabled = true) {
  return useQuery({
    queryKey: queryKeys.miDescriptivoPuesto,
    queryFn: descriptivoPuestoApi.actual,
    enabled,
    retry: retryUnlessClientError,
  });
}

/** Lo abrí: el servidor registra la primera lectura (idempotente). */
export function useMarcarDescriptivoLeido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (acuseId: number) => descriptivoPuestoApi.marcarLeido(acuseId),
    onSuccess: (acuse) => {
      if (acuse) queryClient.setQueryData<AcuseDescriptivoPuesto | null>(queryKeys.miDescriptivoPuesto, acuse);
    },
  });
}

/** «OK, enterado» + comentario: resuelve el pendiente en el servidor. */
export function useAcusarDescriptivoPuesto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ acuseId, comentario }: { acuseId: number; comentario: string }) => descriptivoPuestoApi.acusar(acuseId, comentario),
    onSuccess: (acuse) => {
      if (acuse) queryClient.setQueryData<AcuseDescriptivoPuesto | null>(queryKeys.miDescriptivoPuesto, acuse);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tareas });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    },
  });
}
