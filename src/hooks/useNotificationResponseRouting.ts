import { useEffect } from 'react';

import { queryClient } from '@/api/queryClient';
import { queryKeys, rhQueryKeyPrefix } from '@/api/queryKeys';
import { configureNotificationHandler } from '@/services/pushNotifications';
import { useAuthStore } from '@/store/authStore';
import { usePushDiagnosticsStore } from '@/store/pushDiagnosticsStore';
import { toast } from '@/store/toastStore';
import type { PushNotificationData } from '@/types/pushNotification';
import { experienceForPushType, isPushForCurrentUser, resolveResourceRoute } from '@/utils/appLinks';
import { openCrossExperienceRoute } from '@/utils/crossNavigation';
import { logError } from '@/utils/errors';
import { pushCicloKeys } from '@/utils/pushInvalidation';
import { supportsRemotePush } from '@/utils/runtime';

/**
 * Respuestas (taps) ya procesadas en este proceso. En cold start la misma
 * respuesta puede llegar por `getLastNotificationResponseAsync` Y por el
 * listener; y tras logout → login el efecto vuelve a montarse — sin este
 * registro se navegaría dos veces (o se abriría el push de la sesión
 * anterior).
 */
const handledResponses = new Set<string>();

function responseKey(response: { notification: { request: { identifier: string } }; actionIdentifier: string }): string {
  return `${response.notification.request.identifier}:${response.actionIdentifier}`;
}

/** Solo para pruebas. */
export function __resetHandledPushResponses(): void {
  handledResponses.clear();
}

/**
 * Cachés que un push puede haber dejado obsoletas. Un push de `solicitud`
 * trae `estado`: se invalida también el detalle concreto para que al
 * abrirlo se vea el estado nuevo, no el de la caché.
 */
export function invalidateAfterPush(data?: PushNotificationData): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  void queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap });
  if (data?.type?.startsWith('rh_') || data?.type === 'contrato_por_vencer') {
    void queryClient.invalidateQueries({ queryKey: rhQueryKeyPrefix });
  }

  if (data?.type === 'solicitud' || data?.type === 'vacaciones') {
    void queryClient.invalidateQueries({ queryKey: queryKeys.solicitudes });
    void queryClient.invalidateQueries({ queryKey: queryKeys.vacacionesSaldo });
    if (data.resource_id) void queryClient.invalidateQueries({ queryKey: queryKeys.solicitud(data.resource_id) });
  }
  if (data?.type === 'documento' || data?.type === 'incorporacion') {
    void queryClient.invalidateQueries({ queryKey: queryKeys.incorporacion });
  }

  for (const queryKey of pushCicloKeys(data?.type)) {
    void queryClient.invalidateQueries({ queryKey });
  }
}

/**
 * Encola la navegación (nunca navega aquí): `PendingPushNavigationController`
 * en `(app)/_layout.tsx` la ejecuta cuando el árbol correcto (Mi espacio /
 * Gestión RH) ya está montado — mismo camino para foreground, background y
 * cold start, sin `setTimeout`.
 */
export function openPushTarget(data: PushNotificationData): void {
  const currentUserId = useAuthStore.getState().user?.id ?? null;
  if (!isPushForCurrentUser(data, currentUserId)) {
    // Push de otra cuenta que usó este teléfono antes: no abrir nada suyo.
    openCrossExperienceRoute('/notificaciones', null);
    return;
  }
  const route = resolveResourceRoute(data);
  openCrossExperienceRoute(route ?? '/notificaciones', route ? experienceForPushType(data.type) : null);
}

/**
 * Recepción en foreground (toast con "Ver" — sin abrir otra pantalla por
 * sorpresa) y tap del push (background o cold start → recurso exacto).
 * `expo-notifications` se importa dinámicamente y solo cuando
 * `supportsRemotePush` es verdadero (nunca en Expo Go).
 */
export function useNotificationResponseRouting(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !supportsRemotePush) return undefined;

    let cancelled = false;
    let receivedSubscription: { remove: () => void } | undefined;
    let responseSubscription: { remove: () => void } | undefined;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        await configureNotificationHandler();
        if (cancelled) return;

        const handleResponse = (response: Parameters<Parameters<typeof Notifications.addNotificationResponseReceivedListener>[0]>[0]) => {
          const key = responseKey(response);
          if (handledResponses.has(key)) return;
          handledResponses.add(key);

          const data = (response.notification.request.content.data ?? {}) as PushNotificationData;
          usePushDiagnosticsStore.getState().recordPush(data, 'response');
          invalidateAfterPush(data);
          openPushTarget(data);
          // Que un re-montaje (logout → login) nunca repita esta respuesta.
          Notifications.clearLastNotificationResponseAsync().catch(() => {});
        };

        receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
          const title = notification.request.content.title ?? 'Notificación';
          const body = notification.request.content.body;
          const data = (notification.request.content.data ?? {}) as PushNotificationData;
          usePushDiagnosticsStore.getState().recordPush(data, 'foreground');
          invalidateAfterPush(data);

          const currentUserId = useAuthStore.getState().user?.id ?? null;
          const canOpen = isPushForCurrentUser(data, currentUserId) && resolveResourceRoute(data) !== null;
          toast.info(body ? `${title}: ${body}` : title, canOpen ? { actionLabel: 'Ver', onAction: () => openPushTarget(data) } : undefined);
        });

        responseSubscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

        // Cold start: la app estaba cerrada y se abrió tocando el push.
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (!cancelled && lastResponse) handleResponse(lastResponse);
      } catch (error) {
        logError('useNotificationResponseRouting', error);
      }
    })();

    return () => {
      cancelled = true;
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [enabled]);
}
