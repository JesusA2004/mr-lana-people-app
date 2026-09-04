import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificacionesApi } from '@/api/notificaciones';
import { queryKeys } from '@/api/queryKeys';

export function useNotificaciones() {
  return useQuery({
    queryKey: queryKeys.notificaciones,
    queryFn: notificacionesApi.getAll,
  });
}

export function useMarkNotificacionLeida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => notificacionesApi.markAsRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
