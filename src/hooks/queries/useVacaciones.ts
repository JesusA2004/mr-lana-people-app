import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { vacacionesApi } from '@/api/vacaciones';
import { queryKeys } from '@/api/queryKeys';
import type { CreateVacationRequestPayload } from '@/types/vacation';

export function useVacacionesSaldo() {
  return useQuery({
    queryKey: queryKeys.vacacionesSaldo,
    queryFn: vacacionesApi.getSaldo,
  });
}

export function useVacacionesSolicitudes() {
  return useQuery({
    queryKey: queryKeys.vacacionesSolicitudes,
    queryFn: vacacionesApi.getSolicitudes,
  });
}

export function useCreateVacacionSolicitud() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateVacationRequestPayload) => vacacionesApi.createSolicitud(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.vacacionesSaldo });
      void queryClient.invalidateQueries({ queryKey: queryKeys.vacacionesSolicitudes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    },
  });
}
