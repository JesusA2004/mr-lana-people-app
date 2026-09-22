import { SHOW_DEV_TOOLS } from '@/constants/config';
import type { Experience } from '@/store/experienceStore';
import type { PushNotificationData, PushResourceType } from '@/types/pushNotification';

/**
 * Único lugar donde se traduce `{ type, resource_id, periodo }` (payload de
 * push o `data` de una notificación guardada) a una ruta interna de
 * expo-router. Nunca se construye una ruta a partir de texto humano (título,
 * mensaje) — solo de campos estructurados.
 *
 * Tipos CONFIRMADOS contra el backend real (capacitaciones, emisores en
 * `PushNotifier::aUsuario*` y `NotificadorRhService::notificar()`):
 *
 * - Colaborador: solicitud, vacaciones, documento, incorporacion, cumpleanos
 * - RH/aprobador: rh_solicitud, rh_vacaciones, rh_documento, rh_incorporacion, rh_cumpleanos
 * - Ciclo laboral: documento_firma_pendiente, recibo_nomina, prestamo_autorizado,
 *   expediente_incompleto, alta_activada, visto_bueno_pendiente,
 *   evaluacion_pendiente, evaluacion_devuelta, evaluacion_capturada, contrato_por_vencer
 * - QA: push_test (POST /dispositivos/push-prueba)
 *
 * Un tipo desconocido devuelve `null`: quien llama decide el respaldo (el
 * centro de notificaciones), nunca se inventa una ruta.
 */
export function resolveResourceRoute(data: PushNotificationData): string | null {
  const id = normalizeResourceId(data.resource_id);

  switch (data.type) {
    case 'solicitud':
      return id ? `/solicitud/${id}` : '/(app)/(tabs)/solicitudes';
    case 'documento':
      // `resource_id` es el id del ARCHIVO del expediente (no del tipo de
      // documento): la pantalla lo resuelve con `ref=documento`.
      return id ? `/expediente/${id}?ref=documento` : '/(app)/(tabs)/expediente';
    case 'vacaciones':
      return '/(app)/(tabs)/vacaciones';
    case 'incorporacion':
      return '/incorporacion';
    case 'cumpleanos':
      return '/cumpleanos';

    case 'rh_solicitud':
      return id ? `/(app)/rh/solicitudes/${id}` : '/(app)/rh/(tabs)/pendientes';
    case 'rh_vacaciones':
      return id ? `/(app)/rh/vacaciones/${id}` : '/(app)/rh/(tabs)/pendientes';
    case 'rh_incorporacion':
      return id ? `/(app)/rh/incorporaciones/${id}` : '/(app)/rh/(tabs)/pendientes';
    case 'rh_documento':
      return id ? `/(app)/rh/documentos/${id}` : '/(app)/rh/(tabs)/pendientes';
    case 'rh_cumpleanos':
      // Cuando el aviso resume varios cumpleaños, `resource_id` es null y el
      // backend manda `periodo` — nunca se inventa un id.
      if (id) return `/(app)/rh/cumpleanos/${id}`;
      return data.periodo ? `/(app)/rh/cumpleanos?periodo=${encodeURIComponent(data.periodo)}` : '/(app)/rh/cumpleanos';

    // Ciclo laboral: `resource_id` = id del objeto relacionado (`related_type`).
    case 'documento_firma_pendiente':
      return id ? `/documentos-laborales/${id}` : '/documentos-laborales';
    case 'recibo_nomina':
      return id ? `/recibos/${id}` : '/recibos';
    case 'prestamo_autorizado':
      return id ? `/prestamos/${id}` : '/prestamos';
    case 'expediente_incompleto':
      return '/(app)/(tabs)/expediente';
    case 'alta_activada':
      return '/(app)/(tabs)';
    case 'visto_bueno_pendiente':
      return '/equipo';
    case 'evaluacion_pendiente':
    case 'evaluacion_devuelta':
    case 'evaluacion_capturada':
      return id ? `/evaluaciones/${id}` : '/evaluaciones';
    case 'contrato_por_vencer':
      // `resource_id` es el contrato; la bandeja de vencimientos es la vista útil.
      return '/(app)/rh/contratos/por-vencer';

    case 'push_test':
      return SHOW_DEV_TOOLS ? '/dev/diagnostico-push' : '/notificaciones';

    default:
      return null;
  }
}

/** Solo ids enteros positivos: un id vacío, "abc" o "1/../x" nunca forma parte de una ruta. */
export function normalizeResourceId(raw: PushNotificationData['resource_id']): string | null {
  if (typeof raw === 'number') return Number.isInteger(raw) && raw > 0 ? String(raw) : null;
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    const value = Number.parseInt(raw.trim(), 10);
    return value > 0 ? String(value) : null;
  }
  return null;
}

/**
 * Tipos cuya pantalla es COMPARTIDA por ambas experiencias: tocar el push NO
 * cambia de experiencia (jefes y RH/Dirección usan Evaluaciones y Mi equipo
 * desde cualquiera de las dos).
 */
const SHARED_PUSH_TYPES = new Set<PushResourceType>([
  'visto_bueno_pendiente',
  'evaluacion_pendiente',
  'evaluacion_devuelta',
  'evaluacion_capturada',
  'push_test',
]);

const RH_PUSH_TYPES = new Set<PushResourceType>([
  'rh_solicitud',
  'rh_documento',
  'rh_vacaciones',
  'rh_incorporacion',
  'rh_cumpleanos',
  'contrato_por_vencer',
]);

/**
 * A qué experiencia (Mi espacio/Gestión RH) pertenece un tipo de push —
 * usado para cambiar automáticamente de modo al tocar la notificación.
 * `null` = ruta compartida o tipo desconocido (no cambia de experiencia).
 */
export function experienceForPushType(type?: PushResourceType): Experience | null {
  if (!type) return null;
  if (SHARED_PUSH_TYPES.has(type)) return null;
  if (RH_PUSH_TYPES.has(type)) return 'rh';
  return KNOWN_COLLABORATOR_TYPES.has(type) ? 'colaborador' : null;
}

const KNOWN_COLLABORATOR_TYPES = new Set<PushResourceType>([
  'solicitud',
  'documento',
  'vacaciones',
  'incorporacion',
  'cumpleanos',
  'documento_firma_pendiente',
  'recibo_nomina',
  'prestamo_autorizado',
  'expediente_incompleto',
  'alta_activada',
]);

/**
 * true si el push pertenece a la cuenta con sesión. El backend incluye
 * `user_id` (destinatario) en cada push; si el teléfono cambió de cuenta, un
 * push de la sesión anterior nunca abre datos. Pushes de backends previos
 * (sin `user_id`) se aceptan: las Policies del backend siguen protegiendo
 * el recurso (403/404 → "Este elemento ya no está disponible").
 */
export function isPushForCurrentUser(data: PushNotificationData, currentUserId: string | number | null | undefined): boolean {
  if (data.user_id === undefined || data.user_id === null) return true;
  if (currentUserId === null || currentUserId === undefined) return false;
  return String(data.user_id) === String(currentUserId);
}
