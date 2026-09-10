import type { Experience } from '@/store/experienceStore';
import type { PushNotificationData, PushResourceType } from '@/types/pushNotification';

/**
 * Único lugar donde se traduce `{ type, resource_id }` (payload de push, ver
 * `capacitaciones/docs/PUSH_NOTIFICATIONS.md`) a una ruta interna de
 * expo-router — no repetir este switch en cada listener/pantalla que reciba
 * push (AGENTS.md sección 17: "mapear rutas push", "parser central").
 *
 * Los deep links por esquema (`mrlanapeopleapp://solicitud/123`,
 * `.../expediente/45`, `.../vacaciones`, `.../incorporacion`) NO necesitan
 * este parser: expo-router ya los enruta automáticamente porque el `path`
 * del link coincide 1:1 con las rutas de archivo — un link con una ruta que
 * no existe cae solo en `src/app/+not-found.tsx` (nunca truena la app).
 * Este helper existe para el caso que expo-router NO puede resolver solo:
 * el payload `data` de un push remoto, que no es una URL.
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
    case 'cumpleanos':
      return '/cumpleanos';
    case 'notificacion':
      return '/notificaciones';

    case 'rh_solicitud':
      return data.resource_id ? `/(app)/rh/solicitudes/${data.resource_id}` : '/(app)/rh/(tabs)/pendientes';
    case 'rh_documento':
      return data.resource_id ? `/(app)/rh/documentos/${data.resource_id}` : '/(app)/rh/(tabs)/pendientes';
    case 'rh_vacaciones':
      return data.resource_id ? `/(app)/rh/vacaciones/${data.resource_id}` : '/(app)/rh/(tabs)/pendientes';
    case 'rh_incorporacion':
      return data.resource_id ? `/(app)/rh/incorporaciones/${data.resource_id}` : '/(app)/rh/(tabs)/pendientes';
    case 'rh_pendiente':
      return '/(app)/rh/(tabs)/pendientes';
    case 'rh_cumpleanos':
      // Todavía no existe una API móvil RH de cumpleaños dedicada (confirmado
      // contra routes/api.php de capacitaciones) — cae en Notificaciones RH,
      // nunca en una pantalla rota (AGENTS.md sección 37/61).
      return '/(app)/rh/(tabs)/notificaciones';
    default:
      return null;
  }
}

const RH_PUSH_TYPES = new Set<PushResourceType>([
  'rh_solicitud',
  'rh_documento',
  'rh_vacaciones',
  'rh_incorporacion',
  'rh_pendiente',
  'rh_cumpleanos',
]);

/**
 * A qué experiencia (Mi espacio/Gestión RH) pertenece un tipo de push —
 * usado para cambiar automáticamente de modo al tocar la notificación
 * (AGENTS.md sección 20: "RH está en Mi espacio, llega rh_solicitud → al
 * tocar, cambiar a Gestión RH y abrir detalle, y viceversa"). `null` cuando
 * el tipo no aplica (push desconocido, no navega a ningún lado).
 */
export function experienceForPushType(type?: PushResourceType): Experience | null {
  if (!type) return null;
  return RH_PUSH_TYPES.has(type) ? 'rh' : 'colaborador';
}
