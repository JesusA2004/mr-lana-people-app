import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { toast } from '@/store/toastStore';
import { supportsRemotePush } from '@/utils/runtime';

/**
 * Payload esperado en `data` de cada push (AGENTS.md secciones 25/27,
 * ver docs/MOBILE_BACKEND_REQUIREMENTS.md P0.6): `tipo` + `recurso_id`
 * estructurados, no una URL web como hoy usan las notificaciones in-app
 * (`app/Notifications/*` en capacitaciones siempre arma `url` con
 * `route(...)`, nunca algo que la app pueda navegar).
 */
interface PushNotificationData {
  tipo?: 'solicitud' | 'vacaciones' | 'documento' | 'expediente' | string;
  recurso_id?: string | number;
}

function resolveRoute(data: PushNotificationData): string | null {
  switch (data.tipo) {
    case 'solicitud':
      return data.recurso_id ? `/solicitud/${data.recurso_id}` : '/(app)/(tabs)/solicitudes';
    case 'vacaciones':
      return '/(app)/(tabs)/vacaciones';
    case 'documento':
    case 'expediente':
      return '/(app)/(tabs)/expediente';
    default:
      return null;
  }
}

/**
 * Recepción en foreground (toast interno) y tap de push (navegación al
 * recurso relacionado). `expo-notifications` se importa dinámicamente y
 * solo cuando `supportsRemotePush` es verdadero — nunca a nivel de módulo —
 * para que este hook no arrastre esa dependencia dentro de Expo Go (ver
 * `src/services/pushNotifications.ts` para el porqué exacto del crash que
 * esto corrige).
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
        toast.info(body ? `${title}: ${body}` : title);
      });

      responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = (response.notification.request.content.data ?? {}) as PushNotificationData;
        const route = resolveRoute(data);
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
