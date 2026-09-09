/**
 * Payload `data` de cada push remoto — contrato que le pedimos al backend
 * implementar (ver `docs/BACKEND_REQUIREMENTS_V4.md`, sección push). Nombres
 * en inglés (`type`/`resource_id`) a propósito: es el nombre que se
 * documenta como requerido para el payload de Expo Push API, independiente
 * del idioma del resto de la API REST.
 */
export type PushResourceType = 'solicitud' | 'documento' | 'vacaciones' | 'incorporacion' | 'perfil' | (string & {});

export interface PushNotificationData {
  type?: PushResourceType;
  resource_id?: string | number;
}
