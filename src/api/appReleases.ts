import { apiClient, extractData } from './client';

import type { AppRelease, AppReleasePlatform } from '@/types/appRelease';
import { isNotFoundError } from '@/utils/errors';

/**
 * `GET /api/v1/app/releases/latest|/` — públicos, sin `auth:sanctum`
 * (AGENTS.md sección 39/42). `latest()` responde `{ data: null }` con 404
 * cuando no hay ninguna versión publicada para la plataforma — no es un
 * error de red, así que se normaliza a `null` en vez de propagar el throw.
 */
export const appReleasesApi = {
  async latest(platform: AppReleasePlatform): Promise<AppRelease | null> {
    try {
      const response = await apiClient.get('/app/releases/latest', { params: { platform } });
      return extractData<AppRelease | null>(response.data);
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  },

  async list(platform: AppReleasePlatform): Promise<AppRelease[]> {
    const response = await apiClient.get('/app/releases', { params: { platform } });
    return extractData<AppRelease[]>(response.data);
  },
};
