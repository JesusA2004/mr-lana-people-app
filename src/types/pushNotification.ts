/**
 * Payload `data` de cada push remoto — contrato real confirmado contra
 * `App\Services\MobilePush\PushNotifier` y `NotificadorRhService` en
 * capacitaciones. Nombres en inglés (`type`/`resource_id`) a propósito: es
 * el nombre documentado para el payload de Expo Push API, independiente del
 * idioma del resto de la API REST. Ver `utils/appLinks.ts` para el mapeo.
 */
export type PushResourceType =
  // Colaborador
  | 'solicitud'
  | 'documento'
  | 'vacaciones'
  | 'incorporacion'
  | 'cumpleanos'
  // RH / aprobadores
  | 'rh_solicitud'
  | 'rh_documento'
  | 'rh_vacaciones'
  | 'rh_incorporacion'
  | 'rh_cumpleanos'
  // Ciclo laboral — emitidos por `NotificadorRhService::notificar()`
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
  // QA — `POST /dispositivos/push-prueba`
  | 'push_test'
  | (string & {});

export interface PushNotificationData {
  type?: PushResourceType;
  resource_id?: string | number | null;
  /**
   * `rh_cumpleanos` que resume varios cumpleaños: `resource_id` viaja `null`
   * y el backend manda `route`/`periodo` para abrir la bandeja filtrada —
   * nunca se inventa un id.
   */
  route?: string;
  periodo?: 'hoy' | '7_dias' | '30_dias' | 'mes' | (string & {});
  /** Estado al que pasó la solicitud (`solicitud`): solo señal para refrescar, nunca para decidir permisos. */
  estado?: string;
  /** Color hexadecimal de referencia del backend. La app usa su propio token; ver `src/utils/notificationStyle.ts`. */
  color?: string;
  /** Ciclo laboral: `class_basename` del objeto (`GeneratedDocument`, `EvaluacionPeriodoPrueba`, ...). */
  related_type?: string | null;
  /** Ciclo laboral: acción esperada (`firmar_documento`, `capturar_evaluacion`, `visto_bueno`...). */
  accion?: string | null;
  /** Destinatario del push (id interno). La app no abre pushes de otra cuenta (ver `isPushForCurrentUser`). */
  user_id?: number | string | null;
}
