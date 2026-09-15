import { apiClient, extractData } from '../client';

import type { PaginatedResponse } from '@/types/api';
import type { RhSolicitud } from '@/types/rh';

export interface RhSolicitudesParams {
  estado?: string;
  tipo?: string;
  sucursal_id?: number | string;
  empresa_id?: number | string;
  departamento_id?: number | string;
  q?: string;
  page?: number;
}

/** `GET/POST /api/v1/rh/solicitudes[/{id}/aprobar|rechazar|correccion]`. */
export const rhSolicitudesApi = {
  async list(params: RhSolicitudesParams = {}): Promise<PaginatedResponse<RhSolicitud>> {
    const response = await apiClient.get('/rh/solicitudes', { params });
    return response.data as PaginatedResponse<RhSolicitud>;
  },

  async getById(id: number | string): Promise<RhSolicitud> {
    const response = await apiClient.get(`/rh/solicitudes/${id}`);
    return extractData<RhSolicitud>(response.data);
  },

  async aprobar(id: number | string, comentario?: string): Promise<void> {
    await apiClient.post(`/rh/solicitudes/${id}/aprobar`, comentario ? { comentario } : undefined);
  },

  /** `motivo` es obligatorio — el backend responde 422 sin él. */
  async rechazar(id: number | string, motivo: string): Promise<void> {
    await apiClient.post(`/rh/solicitudes/${id}/rechazar`, { motivo });
  },

  /** `motivo` es obligatorio. */
  async solicitarCorreccion(id: number | string, motivo: string): Promise<void> {
    await apiClient.post(`/rh/solicitudes/${id}/correccion`, { motivo });
  },

  /**
   * `PATCH /api/v1/rh/solicitudes/{id}/estado` — cambio de estado unificado,
   * el mismo destino que el tablero Kanban de la web
   * (`Rh\SolicitudController::actualizarEstado` → `moverEnTablero()`).
   *
   * La app NO implementa un Kanban: solo usa este endpoint para los dos
   * movimientos que `aprobar`/`rechazar`/`correccion` no cubren —
   * `en_revision` (tomar la solicitud) y `cerrada` (darla por concluida).
   * Aprobar y rechazar siguen yendo por sus rutas dedicadas, nunca por
   * aquí, para no duplicar el flujo (sección 17).
   */
  async actualizarEstado(id: number | string, estado: 'en_revision' | 'cerrada', comentario?: string): Promise<void> {
    await apiClient.patch(`/rh/solicitudes/${id}/estado`, comentario ? { estado, comentario } : { estado });
  },
};
