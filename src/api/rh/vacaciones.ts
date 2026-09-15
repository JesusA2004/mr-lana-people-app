import { apiClient, extractData } from '../client';

import type { PaginatedResponse } from '@/types/api';
import type { RhVacacion } from '@/types/rh';

export interface RhVacacionesParams {
  estado?: string;
  sucursal_id?: number | string;
  empresa_id?: number | string;
  q?: string;
  page?: number;
}

/**
 * @deprecated BANDEJA RH LEGACY — fuera de la navegación nueva.
 *
 * `/api/v1/rh/vacaciones/*` revisa la tabla legacy `solicitudes_vacaciones`.
 * Una solicitud de vacaciones creada por la app nueva NUNCA aparece aquí:
 * vive en `solicitudes_internas` y se aprueba/rechaza con `rhSolicitudesApi`
 * (`POST /api/v1/rh/solicitudes/{id}/aprobar`).
 *
 * Se conserva sin borrar porque la bandeja unificada del backend
 * (`RhPendientesService::vacaciones()`) sigue devolviendo pendientes con
 * `tipo: "vacaciones"` mientras existan registros legacy sin cerrar — si RH
 * toca uno de esos, `rh/vacaciones/[id]` tiene que poder resolverlo. Ningún
 * flujo nuevo debe apuntar aquí. Ver `docs/BACKEND_SYNC_2026_09_15.md`.
 */
export const rhVacacionesApi = {
  async list(params: RhVacacionesParams = {}): Promise<PaginatedResponse<RhVacacion>> {
    const response = await apiClient.get('/rh/vacaciones', { params });
    return response.data as PaginatedResponse<RhVacacion>;
  },

  async getById(id: number | string): Promise<RhVacacion> {
    const response = await apiClient.get(`/rh/vacaciones/${id}`);
    return extractData<RhVacacion>(response.data);
  },

  async aprobar(id: number | string): Promise<void> {
    await apiClient.post(`/rh/vacaciones/${id}/aprobar`);
  },

  /** `motivo` es obligatorio. */
  async rechazar(id: number | string, motivo: string): Promise<void> {
    await apiClient.post(`/rh/vacaciones/${id}/rechazar`, { motivo });
  },
};
