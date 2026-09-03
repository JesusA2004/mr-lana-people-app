/**
 * El nombre exacto del campo de usuario en la respuesta de /login o /me
 * (`usuario` vs `user`) no está confirmado; se soportan ambos y se
 * normaliza en `src/api/auth.ts`.
 */
export interface AuthUser {
  id: number | string;
  email: string;
  nombre?: string;
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
