/**
 * Payload `data` de cada push remoto — contrato real confirmado contra
 * `App\Services\MobilePush\PushNotifier`/`docs/PUSH_NOTIFICATIONS.md` en
 * capacitaciones. Nombres en inglés (`type`/`resource_id`) a propósito: es
 * el nombre documentado para el payload de Expo Push API, independiente del
 * idioma del resto de la API REST.
 */
export type PushResourceType =
  // Colaborador
  | 'solicitud'
  | 'documento'
  | 'vacaciones'
  | 'incorporacion'
  | 'perfil'
  | 'cumpleanos'
  | 'notificacion'
  | 'documento_laboral'
  /** Baja de colaborador (`NotificacionesService::ESTILOS['baja']`). */
  | 'baja'
  // RH / aprobadores
  | 'rh_solicitud'
  | 'rh_documento'
  | 'rh_vacaciones'
  | 'rh_incorporacion'
  | 'rh_pendiente'
  | 'rh_cumpleanos'
  | 'rh_extraccion_documento'
  | 'formato_disponible'
  // Ciclo laboral (backend 2026-09-22) — emitidos por `NotificadorRhService::notificar()`
  | 'documento_firma_pendiente'
  | 'recibo_nomina'
  | 'prestamo_autorizado'
  | 'expediente_incompleto'
  | 'alta_activada'
  | 'visto_bueno_pendiente'
  | 'evaluacion_pendiente'
  | 'evaluacion_devuelta'
  | 'evaluacion_capturada'
  | 'contrato_por_vencer'
  | (string & {});

export interface PushNotificationData {
  type?: PushResourceType;
  resource_id?: string | number | null;
  /**
   * Excepción documentada (`docs/PUSH_NOTIFICATIONS.md`, `rh_cumpleanos`):
   * cuando el aviso resume varios cumpleaños en vez de apuntar a uno solo,
   * `resource_id` viaja `null` y el backend manda `route`/`periodo` en su
   * lugar para que la app navegue a la bandeja en el estado correcto —
   * nunca se inventa un id (ni timestamp ni conteo). Ejemplo real:
   * `{ "type": "rh_cumpleanos", "resource_id": null, "route": "rh/cumpleanos", "periodo": "hoy" }`.
   */
  route?: string;
  periodo?: 'hoy' | '7_dias' | '30_dias' | 'mes' | (string & {});
  /**
   * Motivo opcional que puede acompañar `rh_documento` cuando el backend
   * decide notificar por una extracción automática con diferencias
   * importantes (ej. `"extraction_review"`). La app debe ignorar cualquier
   * valor que no reconozca y abrir el documento normal — nunca romper por
   * un `reason` desconocido.
   */
  reason?: string;
  /**
   * Estado al que pasó el recurso (`solicitud`/`rh_solicitud`): el backend
   * lo incluye en el payload del push de cambio de solicitud. La app lo
   * conserva como metadato opcional — sirve para saber que el detalle ya
   * cambió y refrescarlo, nunca para decidir permisos ni para pintar el
   * estado sin releerlo del servidor (sección 21).
   */
  estado?: string;
  /** Color hexadecimal de referencia del backend. La app usa su propio token; ver `src/utils/notificationStyle.ts`. */
  color?: string;
  /** Ciclo laboral: `class_basename` del objeto (`GeneratedDocument`, `EvaluacionPeriodoPrueba`, ...). Informativo. */
  related_type?: string | null;
  /** Ciclo laboral: acción esperada (`firmar_documento`, `capturar_evaluacion`, `visto_bueno`...). Informativo. */
  accion?: string | null;
}
