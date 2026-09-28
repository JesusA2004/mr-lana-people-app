import { apiClient, extractData } from './client';

import type { AuthUser, LoginPayload, LoginResponse } from '@/types/auth';

/** Acepta tanto `usuario` como `user` en la respuesta de login/me. */
function normalizeLoginResponse(payload: unknown): LoginResponse {
  const data = extractData<LoginResponse>(payload);
  return {
    token: data.token,
    usuario: data.usuario ?? data.user,
    user: data.user ?? data.usuario,
  };
}

export const authApi = {
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
};
