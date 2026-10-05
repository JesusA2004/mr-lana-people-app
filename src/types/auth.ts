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
