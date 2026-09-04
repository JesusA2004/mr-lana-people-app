/**
 * Confirmado contra backend real (App\Http\Controllers\Api\V1\AuthController::login/me,
 * ver capacitaciones/docs/API_MOVIL.md): el usuario siempre trae `nombre` +
 * `apellidos` por separado y `correo` (no `email`). Se conservan `email`/`name`
 * como opcionales de compatibilidad por si una respuesta futura cambia de forma,
 * pero la app ya no debe depender de ellos como fuente primaria.
 */
export interface AuthUser {
  id: number | string;
  nombre?: string;
  apellidos?: string;
  correo?: string;
  roles?: string[];
  permisos?: string[];
  /** Compatibilidad con formas alternativas de respuesta. */
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export interface LoginPayload {
  email: string;
  password: string;
  device_name: string;
}

export interface LoginResponse {
  token: string;
  usuario?: AuthUser;
  user?: AuthUser;
}
