import { apiClient, extractData } from '../client';
import { normalizeReingreso, normalizeReingresoBusqueda, normalizeReingresoHistorial } from '../normalizers/rhReingreso';

import type { Reingreso, ReingresoCandidatoBusqueda, ReingresoHistorial, SolicitarReingresoPayload } from '@/types/rhReingreso';
import { asArray, normalizePaginated, type Paginated } from '@/utils/normalize';

/**
 * Reingresos — `/api/v1/rh/reingresos/*` (permiso `reingresos.gestionar` o
 * `reingresos.solicitar`, alcance). Mismo `ReingresoService` que la web:
 * busca a la MISMA persona, nunca crea un colaborador nuevo.
 */
export const rhReingresosApi = {
  async list(params: { estado?: string; page?: number; per_page?: number } = {}): Promise<Paginated<Reingreso>> {
    const response = await apiClient.get('/rh/reingresos', { params });
    return normalizePaginated(response.data, normalizeReingreso);
  },

  async buscar(q: string): Promise<ReingresoCandidatoBusqueda[]> {
    const response = await apiClient.get('/rh/reingresos/buscar', { params: { q } });
    return asArray(extractData<unknown>(response.data)).map(normalizeReingresoBusqueda);
  },

  async historial(colaboradorId: number | string): Promise<ReingresoHistorial> {
    const response = await apiClient.get(`/rh/reingresos/historial/${colaboradorId}`);
    return normalizeReingresoHistorial(extractData<unknown>(response.data));
  },

  async solicitar(colaboradorId: number | string, payload: SolicitarReingresoPayload): Promise<Reingreso> {
    const response = await apiClient.post('/rh/reingresos', { colaborador_id: colaboradorId, ...payload });
    return normalizeReingreso(extractData<unknown>(response.data));
  },

  async decidir(id: number | string, viable: boolean, comentario?: string | null): Promise<Reingreso> {
    const response = await apiClient.post(`/rh/reingresos/${id}/decidir`, { viable, comentario: comentario || null });
    return normalizeReingreso(extractData<unknown>(response.data));
  },
};
