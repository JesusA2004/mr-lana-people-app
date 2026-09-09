export type DevicePlatform = 'ios' | 'android' | 'web';

/**
 * Payload sugerido para `POST /api/v1/dispositivos/push-token` — ver
 * `docs/BACKEND_REQUIREMENTS_V4.md` (endpoint todavía no existe en
 * capacitaciones). Nunca incluye `user_id`: el backend lo obtiene de
 * `$request->user()` vía Sanctum.
 */
export interface RegisterPushTokenPayload {
  token: string;
  platform: DevicePlatform;
  device_name?: string;
  /** Versión de la app (`app.json` `expo.version`) — ayuda a RH a saber qué build reportó el token. */
  app_version?: string;
}
