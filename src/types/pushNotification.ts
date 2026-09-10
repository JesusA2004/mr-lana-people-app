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
  // RH / aprobadores
  | 'rh_solicitud'
  | 'rh_documento'
  | 'rh_vacaciones'
  | 'rh_incorporacion'
  | 'rh_pendiente'
  | 'rh_cumpleanos'
  | (string & {});

export interface PushNotificationData {
  type?: PushResourceType;
  resource_id?: string | number;
}
