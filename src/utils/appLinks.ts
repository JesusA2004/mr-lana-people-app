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
 * - Celebraciones unificadas: aniversario_laboral, cumpleanos_general,
 *   aniversario_general, celebracion_mensaje (`CelebracionNotification`,
 *   confirmado contra `capacitaciones@cc4beeb`)
 * - RH/aprobador: rh_solicitud, rh_vacaciones, rh_documento, rh_incorporacion, rh_cumpleanos
 * - Ciclo laboral: documento_firma_pendiente, recibo_nomina, prestamo_autorizado,
 *   expediente_incompleto, alta_activada, visto_bueno_pendiente,
 *   evaluacion_pendiente, evaluacion_devuelta, evaluacion_capturada, contrato_por_vencer
 * - Muro de cumpleaños: cumpleanos_muro (resource_id = greeting)
 * - QA: push_test (POST /dispositivos/push-prueba)
 *
 * Un tipo desconocido devuelve `null`: quien llama decide el respaldo (el
 * centro de notificaciones), nunca se inventa una ruta.
 */
export function resolveResourceRoute(data: PushNotificationData): string | null {
  const id = normalizeResourceId(data.resource_id);
  const colaboradorId = normalizeResourceId(data.colaborador_id);

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

    // Celebraciones unificadas: siempre llevan a la celebración concreta
    // (`resource_id` = id de `BirthdayGreeting`), nunca a una bandeja.
    case 'aniversario_laboral':
    case 'cumpleanos_general':
    case 'aniversario_general':
    case 'celebracion_mensaje':
      return id ? `/celebracion/${id}` : null;

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

    case 'cumpleanos_muro':
      return id ? `/muro-cumpleanos/${id}` : '/notificaciones';

    case 'push_test':
      return SHOW_DEV_TOOLS ? '/dev/diagnostico-push' : '/notificaciones';

    // Lecciones de bienvenida (al colaborador): siempre su lista; la
    // lección exacta la elige desde ahí (el estado viene de mi-proceso).
    case 'onboarding_habilitado':
    case 'onboarding_reevaluacion':
      return '/lecciones';
    // Reingreso autorizado (al colaborador): actualizar documentos.
    case 'reingreso_autorizado':
      return '/(app)/(tabs)/expediente';
    // Visto bueno de una solicitud de su equipo (jefe): bandeja de equipo.
    case 'solicitud_visto_bueno':
      return '/equipo';
    // RH: refuerzo/activos del onboarding y contratos listos → ficha de la
    // persona (`colaborador_id` lo manda el backend en cada aviso).
    case 'onboarding_refuerzo':
    case 'onboarding_activos':
      return colaboradorId ? `/(app)/rh/onboarding/${colaboradorId}` : '/(app)/rh/(tabs)/pendientes';
    case 'contratos_listos':
      return colaboradorId ? `/(app)/rh/colaboradores/${colaboradorId}` : '/(app)/rh/(tabs)/pendientes';

    default:
      // Eventos de reclutamiento/reingreso (`candidato_preautorizado`,
      // `candidato_autorizado_rh`, `reingreso_solicitado`...): el backend
      // real los manda con `type` = nombre del evento (variable), pero
      // `related_type` siempre es el class_basename real del modelo — se usa
      // como respaldo en vez de enumerar cada evento uno por uno.
      if (data.related_type === 'Candidato') return id ? `/(app)/rh/candidatos/${id}` : '/(app)/rh/candidatos';
      if (data.related_type === 'Reingreso') return '/(app)/rh/reingresos';
      if (data.related_type === 'CierreLaboral') return id ? `/(app)/rh/cierres/${id}` : '/(app)/rh/cierres';
      if (data.related_type === 'SolicitudInterna') return id ? `/(app)/rh/solicitudes/${id}` : '/(app)/rh/(tabs)/pendientes';
      if (data.related_type === 'EvaluacionPeriodoPrueba') return id ? `/evaluaciones/${id}` : '/evaluaciones';
      if (data.related_type === 'OnboardingAvance' || data.related_type === 'OnboardingProceso') {
        return colaboradorId ? `/(app)/rh/onboarding/${colaboradorId}` : '/(app)/rh/(tabs)/pendientes';
      }
      if (data.related_type === 'ContratoLaboral' || data.related_type === 'GeneratedDocument') {
        return colaboradorId ? `/(app)/rh/colaboradores/${colaboradorId}` : '/(app)/rh/(tabs)/pendientes';
      }
      return null;
  }
}

/** Rutas que SOLO existen en Mi espacio (árbol del colaborador). */
const RUTAS_COLABORADOR = ['/(app)/(tabs)', '/lecciones', '/solicitud/', '/expediente/', '/documentos-laborales', '/recibos', '/prestamos', '/contratos', '/incorporacion', '/jerarquia'];

/**
 * Experiencia en la que vive una ruta: así un aviso de un tipo nuevo nunca
 * intenta abrir una pantalla de Gestión RH con el árbol de Mi espacio
 * montado (eso era "ruta inexistente"). `null` = pantalla compartida.
 */
export function experienceForRoute(route: string | null | undefined): Experience | null {
  if (!route) return null;
  if (route.startsWith('/(app)/rh/') || route.startsWith('/rh/')) return 'rh';
  return RUTAS_COLABORADOR.some((r) => route === r || route.startsWith(r)) ? 'colaborador' : null;
}

/** Experiencia final de un aviso: la del tipo si se conoce, si no la de su ruta destino. */
export function experienceForPush(data: PushNotificationData, route: string | null): Experience | null {
  return experienceForPushType(data.type) ?? experienceForRoute(route);
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
  'cumpleanos_muro',
  'push_test',
]);

const RH_PUSH_TYPES = new Set<PushResourceType>([
  'rh_solicitud',
  'rh_documento',
  'rh_vacaciones',
  'rh_incorporacion',
  'rh_cumpleanos',
  'contrato_por_vencer',
  // Eventos de `config/configuracion_sistema.php` → `eventos` dirigidos a
  // reclutamiento/RH (`WorkflowRoutingService`/`NotificadorRhService`).
  'candidato_preautorizado',
  'contratos_listos',
  'onboarding_refuerzo',
  'cierre_preautorizacion',
  'cierre_autorizacion_rh',
  'pago_por_programar',
  'cita_finiquito',
  'reingreso_solicitado',
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
  'aniversario_laboral',
  'cumpleanos_general',
  'aniversario_general',
  'celebracion_mensaje',
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
