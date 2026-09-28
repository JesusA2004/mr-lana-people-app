import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { notificacionesApi } from '@/api/notificaciones';
import { queryKeys } from '@/api/queryKeys';
import { setBadgeCount } from '@/utils/badge';

export function useNotificaciones() {
  return useQuery({
    queryKey: queryKeys.notificaciones,
    queryFn: notificacionesApi.getAll,
    staleTime: 30_000,
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

/** Al TOCAR una notificación (ver `notificacionesApi.abrir`) — reemplaza a `useMarkNotificacionLeida` para ese caso. */
export function useAbrirNotificacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => notificacionesApi.abrir(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap });
    },
  });
}

/** `POST /api/v1/notificaciones/leer-todas` — `NotificacionController::marcarTodasLeidas`. */
export function useMarkAllNotificacionesLeidas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificacionesApi.markAllAsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * Mantiene el badge del ícono de la app = notificaciones no leídas (V4
 * sección 19). Reutiliza la misma query que `useNotificaciones` (React
 * Query la comparte por `queryKey`, no dispara un fetch extra) — se monta
 * una sola vez en `(app)/_layout.tsx` para que el badge se actualice sin
 * importar qué pantalla esté abierta.
 */
export function useNotificationBadgeSync(): void {
  const { data } = useNotificaciones();

  useEffect(() => {
    if (!data) return;
    const unread = data.filter((item) => !item.leida).length;
    void setBadgeCount(unread);
  }, [data]);
}
