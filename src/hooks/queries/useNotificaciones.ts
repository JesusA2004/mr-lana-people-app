import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { notificacionesApi } from '@/api/notificaciones';
import { queryKeys } from '@/api/queryKeys';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { setBadgeCount } from '@/utils/badge';

/**
 * Historial de notificaciones paginado de verdad (antes `GET /notificaciones`
 * solo traía las 30 más recientes con un `useQuery` normal, sin ninguna
 * forma de ver algo más viejo). `items` ya viene aplanado (todas las
 * páginas cargadas juntas) para que las pantallas no tengan que lidiar con
 * la forma `{ pages: [...] }` de React Query.
 */
export function useNotificaciones() {
  const query = useInfiniteQuery({
    queryKey: queryKeys.notificaciones,
    queryFn: ({ pageParam }) => notificacionesApi.getPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const current = lastPage.meta?.current_page ?? 1;
      const last = lastPage.meta?.last_page ?? current;
      return current < last ? current + 1 : undefined;
    },
    staleTime: 30_000,
  });

  const items = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);

  return { ...query, items };
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
 * sección 19). Usa el contador autoritativo de `mobile/bootstrap`
 * (`counts.notifications`), NO la lista paginada de `useNotificaciones`:
 * con paginación, la primera página ya no garantiza traer todas las no
 * leídas si hay más de 30 notificaciones viejas sin leer. Se monta una sola
 * vez en `(app)/_layout.tsx` para que el badge se actualice sin importar
 * qué pantalla esté abierta.
 */
export function useNotificationBadgeSync(): void {
  const { data } = useMobileBootstrap(true);
  const unread = data?.counts.notifications;

  useEffect(() => {
    if (unread === undefined) return;
    void setBadgeCount(unread);
  }, [unread]);
}
