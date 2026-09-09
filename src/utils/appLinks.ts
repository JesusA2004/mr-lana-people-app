import type { PushNotificationData } from '@/types/pushNotification';

/**
 * Único lugar donde se traduce `{ type, resource_id }` (payload de push, ver
 * `docs/BACKEND_REQUIREMENTS_V4.md`) a una ruta interna de expo-router — no
 * repetir este switch en cada listener/pantalla que reciba push (V4 sección
 * 92: "parser central, no parsear deep links manualmente en 6 archivos").
 *
 * Los deep links por esquema (`mrlanapeopleapp://solicitud/123`,
 * `.../expediente/45`, `.../vacaciones`, `.../incorporacion`) NO necesitan
 * este parser: expo-router ya los enruta automáticamente porque el `path`
 * del link coincide 1:1 con las rutas de archivo (`/solicitud/[id]`,
 * `/expediente/[tipoId]`, etc.) — un link con una ruta que no existe cae
 * solo en `src/app/+not-found.tsx` (nunca truena la app). Este helper existe
 * para el caso que expo-router NO puede resolver solo: el payload `data` de
 * un push remoto, que no es una URL.
 */
export function resolveResourceRoute(data: PushNotificationData): string | null {
  switch (data.type) {
    case 'solicitud':
      return data.resource_id ? `/solicitud/${data.resource_id}` : '/(app)/(tabs)/solicitudes';
    case 'documento':
      return data.resource_id ? `/expediente/${data.resource_id}` : '/(app)/(tabs)/expediente';
    case 'vacaciones':
      return '/(app)/(tabs)/vacaciones';
    case 'incorporacion':
      return '/incorporacion';
    case 'perfil':
      return '/(app)/(tabs)/perfil';
    default:
      return null;
  }
}
