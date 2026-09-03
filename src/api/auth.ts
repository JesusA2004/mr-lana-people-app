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

  async logout(): Promise<void> {
    await apiClient.post('/logout');
  },

  async me(): Promise<AuthUser> {
    const response = await apiClient.get('/me');
    return extractData<AuthUser>(response.data);
  },
};
