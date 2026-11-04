import { apiClient, extractData } from './client';
import { normalizeGuia } from './normalizers/guia';

import type { GuiaColaborador } from '@/types/guia';

/** `GET /colaborador/guia` — «Tu siguiente paso» (`GuiaColaboradorController`). */
export const guiaApi = {
  async get(): Promise<GuiaColaborador> {
    const response = await apiClient.get('/colaborador/guia');
    return normalizeGuia(extractData<unknown>(response.data));
  },
};
