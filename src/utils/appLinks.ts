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
    case 'baja':
      // Aviso sensible (`NotificacionesService::ESTILOS` lo pinta en rojo).
      // La app abre la solicitud de baja relacionada cuando el backend manda
      // el id, y si no, el centro de notificaciones — NUNCA agrega detalle
      // sensible propio: se muestra exactamente lo que el backend envió
      // (sección 22).
      return data.resource_id ? `/solicitud/${data.resource_id}` : '/notificaciones';
    case 'documento_laboral':
      // "Documentos laborales" del colaborador (AGENTS.md de este encargo,
      // sección 19-22) — distinto de `documento` (expediente), que es lo
      // que el colaborador ENTREGA a RH.
      return data.resource_id ? `/documentos-laborales/${data.resource_id}` : '/documentos-laborales';

    case 'rh_solicitud':
      return data.resource_id ? `/(app)/rh/solicitudes/${data.resource_id}` : '/(app)/rh/(tabs)/pendientes';
    case 'rh_vacaciones':
      return data.resource_id ? `/(app)/rh/vacaciones/${data.resource_id}` : '/(app)/rh/(tabs)/pendientes';
    case 'rh_incorporacion':
      return data.resource_id ? `/(app)/rh/incorporaciones/${data.resource_id}` : '/(app)/rh/(tabs)/pendientes';
    case 'rh_pendiente':
      return '/(app)/rh/(tabs)/pendientes';

    case 'rh_documento':
      if (!data.resource_id) return '/(app)/rh/(tabs)/pendientes';
      // `reason: "extraction_review"` (sección 12): abre el documento
      // directo en la sección "Análisis automático" en vez del detalle
      // normal. Cualquier otro `reason` (o ninguno) se ignora — nunca
      // romper por un valor desconocido, siempre abre el documento normal.
      return data.reason === 'extraction_review'
        ? `/(app)/rh/documentos/${data.resource_id}?focus=extraccion`
        : `/(app)/rh/documentos/${data.resource_id}`;
    case 'rh_extraccion_documento':
      // Push dedicado (sección 12): siempre abre directo en "Análisis automático".
      return data.resource_id ? `/(app)/rh/documentos/${data.resource_id}?focus=extraccion` : '/(app)/rh/(tabs)/pendientes';

    case 'rh_cumpleanos':
      // Excepción documentada (`docs/PUSH_NOTIFICATIONS.md`): cuando el
      // aviso resume varios cumpleaños, `resource_id` es null y el backend
      // manda `periodo` para navegar a la bandeja en el estado correcto —
      // nunca se inventa un id.
      if (data.resource_id) return `/(app)/rh/cumpleanos/${data.resource_id}`;
      return data.periodo ? `/(app)/rh/cumpleanos?periodo=${encodeURIComponent(data.periodo)}` : '/(app)/rh/cumpleanos';

    case 'formato_disponible':
      // Los formatos generados son un módulo de RH (AGENTS.md de este
      // encargo, secciones 13-18) — sin una pantalla de detalle propia por
      // `documento_generado_id` todavía, cae elegantemente en la lista.
      return '/(app)/rh/formatos';

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
  'rh_extraccion_documento',
  'formato_disponible',
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
