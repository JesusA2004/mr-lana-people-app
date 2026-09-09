import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import { toast } from '@/store/toastStore';
import type { PushNotificationData } from '@/types/pushNotification';
import { resolveResourceRoute } from '@/utils/appLinks';
import { supportsRemotePush } from '@/utils/runtime';

/**
 * Recepción en foreground (toast interno + refresco de notificaciones/
 * dashboard para que el badge se actualice, V4 sección 89) y tap de push
 * (navegación al recurso relacionado, V4 sección 15). `expo-notifications`
 * se importa dinámicamente y solo cuando `supportsRemotePush` es verdadero —
 * nunca a nivel de módulo — para que este hook no arrastre esa dependencia
 * dentro de Expo Go (ver `src/services/pushNotifications.ts` para el
 * porqué exacto del crash que esto corrige).
 */
export function useNotificationResponseRouting(enabled: boolean): void {
  const router = useRouter();

  useEffect(() => {
    if (!enabled || !supportsRemotePush) return undefined;

    let cancelled = false;
    let receivedSubscription: { remove: () => void } | undefined;
    let responseSubscription: { remove: () => void } | undefined;

    (async () => {
      const Notifications = await import('expo-notifications');
      if (cancelled) return;

      receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
        const title = notification.request.content.title ?? 'Notificación';
        const body = notification.request.content.body;
        const data = (notification.request.content.data ?? {}) as PushNotificationData;
        const route = resolveResourceRoute(data);

        // El historial real sigue siendo GET /notificaciones (V4 sección 18):
        // el push solo avisa, así que refrescamos esa cache y el dashboard
        // para que el contador de no leídas quede al día de inmediato.
        void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });

        toast.info(body ? `${title}: ${body}` : title, route ? { actionLabel: 'Ver', onAction: () => router.push(route as never) } : undefined);
      });

      responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = (response.notification.request.content.data ?? {}) as PushNotificationData;
        const route = resolveResourceRoute(data);
        router.push((route ?? '/notificaciones') as Parameters<typeof router.push>[0]);
      });
    })();

    return () => {
      cancelled = true;
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [enabled, router]);
}
