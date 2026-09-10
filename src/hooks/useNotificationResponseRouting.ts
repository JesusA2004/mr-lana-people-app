import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { queryClient } from '@/api/queryClient';
import { queryKeys, rhQueryKeyPrefix } from '@/api/queryKeys';
import { useExperienceStore } from '@/store/experienceStore';
import { toast } from '@/store/toastStore';
import type { PushNotificationData } from '@/types/pushNotification';
import { experienceForPushType, resolveResourceRoute } from '@/utils/appLinks';
import { supportsRemotePush } from '@/utils/runtime';

/** Cachés que cualquier push (colaborador o RH) puede haber invalidado — barato refrescarlas todas. */
function invalidateAfterPush(): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  void queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap });
  void queryClient.invalidateQueries({ queryKey: rhQueryKeyPrefix });
}

/** Si el push pertenece a la otra experiencia, cambia de modo antes de navegar (AGENTS.md sección 20). */
function switchExperienceIfNeeded(data: PushNotificationData): void {
  const target = experienceForPushType(data.type);
  if (!target) return;
  const current = useExperienceStore.getState().experience;
  if (current !== target) {
    void useExperienceStore.getState().setExperience(target);
  }
}

/**
 * Recepción en foreground (toast interno + refresco de notificaciones/
 * dashboard/RH para que los badges se actualicen, AGENTS.md sección 18) y
 * tap de push (navegación al recurso relacionado + cambio de experiencia si
 * aplica, sección 19/20). `expo-notifications` se importa dinámicamente y
 * solo cuando `supportsRemotePush` es verdadero — nunca a nivel de módulo —
 * para que este hook no arrastre esa dependencia dentro de Expo Go (ver
 * `src/services/pushNotifications.ts`).
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

        invalidateAfterPush();

        toast.info(
          body ? `${title}: ${body}` : title,
          route
            ? {
                actionLabel: 'Ver',
                onAction: () => {
                  switchExperienceIfNeeded(data);
                  router.push(route as never);
                },
              }
            : undefined,
        );
      });

      responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = (response.notification.request.content.data ?? {}) as PushNotificationData;
        const route = resolveResourceRoute(data);
        switchExperienceIfNeeded(data);
        invalidateAfterPush();
        router.push((route ?? '/notificaciones') as Parameters<typeof router.push>[0]);
      });

      // Cold start (AGENTS.md sección 19): si la app estaba completamente
      // cerrada y el usuario abrió tocando un push, `addNotificationResponseReceivedListener`
      // no dispara para esa respuesta inicial — hay que pedirla aparte.
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (!cancelled && lastResponse) {
        const data = (lastResponse.notification.request.content.data ?? {}) as PushNotificationData;
        const route = resolveResourceRoute(data);
        if (route) {
          switchExperienceIfNeeded(data);
          invalidateAfterPush();
          router.push(route as Parameters<typeof router.push>[0]);
        }
      }
    })();

    return () => {
      cancelled = true;
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [enabled, router]);
}
