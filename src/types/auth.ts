import type { BloqueoDocumentos, CartaCompromisoResumen } from './cartaCompromiso';

/**
 * Confirmado contra backend real (App\Http\Controllers\Api\V1\AuthController::login/me,
 * ver capacitaciones/docs/API_MOVIL.md y docs/AUTENTICACION.md): se inicia
 * sesión con `username` («Jesus Arizmendi»: primer nombre + primer apellido),
 * no con el correo. El usuario trae `nombre` + `apellidos` por separado y
 * `correo` (opcional, puede venir null). Se conservan `email`/`name` como
 * opcionales de compatibilidad.
 */
export interface AuthUser {
  id: number | string;
  username?: string;
  nombre?: string;
  apellidos?: string;
  correo?: string | null;
  roles?: string[];
  permisos?: string[];
  /** Contraseña temporal: la app solo deja cambiarla antes de entrar. */
  debe_cambiar_contrasena?: boolean;
  /**
   * `false` = se registró con el QR y no ha terminado su registro completo
   * (datos + documentos): la app solo muestra el asistente `/registro`.
   * Ausente (backend anterior) = no se bloquea nada.
   */
  registro_completo?: boolean;
  /**
   * Documentos pendientes sin carta compromiso vigente: `activo` = la app
   * solo deja subir documentos (pantalla `/documentos-pendientes`). Ausente
   * (backend anterior) = no se bloquea nada.
   */
  bloqueo_documentos?: BloqueoDocumentos | null;
  /** Carta compromiso de documentos pendientes (banner mientras está vigente). */
  carta_compromiso?: CartaCompromisoResumen | null;
  /** Compatibilidad con formas alternativas de respuesta. */
  email?: string | null;
  name?: string;
  [key: string]: unknown;
}

export interface LoginPayload {
  username: string;
  password: string;
  device_name: string;
}

export interface LoginResponse {
  token: string;
  debe_cambiar_contrasena?: boolean;
  usuario?: AuthUser;
  user?: AuthUser;
}

export interface CambiarContrasenaPayload {
  password_actual: string;
  password: string;
  password_confirmation: string;
}
