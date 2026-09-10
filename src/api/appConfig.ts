import { apiClient } from './client';

import type { AppConfig } from '@/types/appRelease';

/** `GET /api/v1/app/config` — público, sin `auth:sanctum` (AGENTS.md sección 38/58). */
export const appConfigApi = {
  async get(): Promise<AppConfig> {
    const response = await apiClient.get('/app/config');
    return response.data as AppConfig;
  },
};
