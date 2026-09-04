import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { toast } from '@/store/toastStore';

/**
 * Payload esperado en `data` de cada push (AGENTS.md secciones 25/27,
 * ver docs/MOBILE_BACKEND_REQUIREMENTS.md P0.1): `tipo` + `recurso_id`
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
 * recurso relacionado). Independiente de `usePushRegistration` — este hook
 * corre siempre que hay sesión activa, sin importar si el registro del
 * token tuvo éxito, porque una notificación puede llegar por otras vías
 * (por ejemplo, ya registrada en una sesión anterior del mismo dispositivo).
 */
export function useNotificationResponseRouting(enabled: boolean): void {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return undefined;

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const title = notification.request.content.title ?? 'Notificación';
      const body = notification.request.content.body;
      toast.info(body ? `${title}: ${body}` : title);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as PushNotificationData;
      const route = resolveRoute(data);
      router.push((route ?? '/notificaciones') as Parameters<typeof router.push>[0]);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [enabled, router]);
}
