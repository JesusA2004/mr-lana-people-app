/** Usuario autenticado normalizado para la app móvil. */
export interface AuthUser {
  id: number | string;
  nombre?: string;
  apellidos?: string;
  email?: string;
  correo?: string;
  roles?: string[];
  permisos?: string[];
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
