import { useEffect } from 'react';

import { queryClient } from '@/api/queryClient';
import { queryKeys, rhQueryKeyPrefix } from '@/api/queryKeys';
import { useExperienceStore } from '@/store/experienceStore';
import { setPendingPushNavigation } from '@/store/pendingNavigationStore';
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

/**
 * Cambia de experiencia si el push pertenece a la otra (AGENTS.md sección
 * 20) y ENCOLA la navegación real — nunca navega aquí mismo. Ni este hook
 * (montado en la raíz, antes de que `(app)/_layout.tsx` siquiera exista) ni
 * el listener de un push en cold start saben si el árbol de navegación
 * (Mi espacio/Gestión RH) que contiene la ruta destino ya está montado —
 * `PendingPushNavigationController` sí lo sabe y es quien navega de verdad
 * (AGENTS.md sección 11/12: "no debe intentar router.push antes de que la
 * ruta RH exista/montada").
 */
function queueNavigation(data: PushNotificationData, route: string): void {
  const target = experienceForPushType(data.type);
  if (target) {
    const current = useExperienceStore.getState().experience;
    if (current !== target) void useExperienceStore.getState().setExperience(target);
  }
  setPendingPushNavigation({ route, experience: target });
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
                onAction: () => queueNavigation(data, route),
              }
            : undefined,
        );
      });

      responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = (response.notification.request.content.data ?? {}) as PushNotificationData;
        const route = resolveResourceRoute(data);
        invalidateAfterPush();
        queueNavigation(data, route ?? '/notificaciones');
      });

      // Cold start (AGENTS.md sección 19): si la app estaba completamente
      // cerrada y el usuario abrió tocando un push, `addNotificationResponseReceivedListener`
      // no dispara para esa respuesta inicial — hay que pedirla aparte.
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (!cancelled && lastResponse) {
        const data = (lastResponse.notification.request.content.data ?? {}) as PushNotificationData;
        const route = resolveResourceRoute(data);
        if (route) {
          invalidateAfterPush();
          queueNavigation(data, route);
        }
      }
    })();

    return () => {
      cancelled = true;
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [enabled]);
}
