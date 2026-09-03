import { apiClient, extractData } from './client';

import type { AuthUser, LoginPayload, LoginResponse } from '@/types/auth';

function normalizeUser(payload: AuthUser | undefined): AuthUser | undefined {
  if (!payload) return undefined;

  return {
    ...payload,
    nombre: payload.nombre ?? (typeof payload.name === 'string' ? payload.name : undefined),
    email: payload.email ?? payload.correo,
    correo: payload.correo ?? payload.email,
  };
}

function normalizeLoginResponse(payload: unknown): LoginResponse {
  const data = extractData<LoginResponse>(payload);
  const normalizedUser = normalizeUser(data.usuario ?? data.user);

  return {
    token: data.token,
    usuario: normalizedUser,
    user: normalizedUser,
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
    const user = normalizeUser(extractData<AuthUser>(response.data));
    if (!user) throw new Error('La API no devolvió el usuario autenticado.');
    return user;
  },
};
