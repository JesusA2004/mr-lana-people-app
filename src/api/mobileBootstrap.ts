import { apiClient, extractData } from './client';

import type { MobileBootstrap } from '@/types/mobileBootstrap';

/**
 * `GET /api/v1/mobile/bootstrap` — `App\Http\Controllers\Api\V1\MobileBootstrapController`.
 * Contexto principal que la app carga justo después de autenticarse
 * (AGENTS.md sección 2): usuario, capabilities, features y contadores.
 */
export const mobileBootstrapApi = {
  async get(): Promise<MobileBootstrap> {
    const response = await apiClient.get('/mobile/bootstrap');
    return extractData<MobileBootstrap>(response.data);
  },
};
