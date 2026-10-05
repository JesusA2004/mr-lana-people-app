import { apiClient, extractData } from './client';

import type { AuthUser, CambiarContrasenaPayload, LoginPayload, LoginResponse } from '@/types/auth';

/**
 * Acepta tanto `usuario` como `user` en la respuesta de login/me. El aviso de
 * contraseña temporal viene a nivel raíz en /login: se copia al usuario para
 * que el enrutador lo lea desde un solo lugar.
 */
function normalizeLoginResponse(payload: unknown): LoginResponse {
  const data = extractData<LoginResponse>(payload);
  const base = data.usuario ?? data.user;
  const usuario =
    base !== undefined && data.debe_cambiar_contrasena !== undefined
      ? { ...base, debe_cambiar_contrasena: data.debe_cambiar_contrasena }
      : base;

  return {
    token: data.token,
    debe_cambiar_contrasena: data.debe_cambiar_contrasena,
    usuario,
    user: usuario,
  };
}

export const authApi = {
  /** Usuario = primer nombre + primer apellido («Jesus Arizmendi»), nunca el correo. */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await apiClient.post('/login', payload);
    return normalizeLoginResponse(response.data);
  },

  async logout(options: { timeout?: number } = {}): Promise<void> {
    await apiClient.post('/logout', undefined, { timeout: options.timeout });
  },

  async me(options: { timeout?: number } = {}): Promise<AuthUser> {
    const response = await apiClient.get('/me', { timeout: options.timeout });
    return extractData<AuthUser>(response.data);
  },

  /**
   * Reautenticación para `LockScreen`: confirma la contraseña de la sesión
   * YA autenticada (Bearer actual) sin crear ni revocar ningún token. A
   * diferencia de `login()`, nunca debe usarse para iniciar sesión.
   */
  async reautenticar(password: string): Promise<void> {
    await apiClient.post('/reautenticar', { password });
  },

  /** Cambio de la contraseña temporal (obligatorio antes de usar la app). */
  async cambiarContrasena(payload: CambiarContrasenaPayload): Promise<void> {
    await apiClient.post('/cambiar-contrasena', payload);
  },
};
