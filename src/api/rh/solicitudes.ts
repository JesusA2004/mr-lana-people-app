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

  /**
   * El backend responde `{ message, data }`, donde `message` puede incluir
   * si el documento oficial (PDF de vacaciones/permiso/préstamo/baja) se
   * generó correctamente o falló (`capacitaciones@587fc72`, sección 3 del
   * encargo 2026-09-15) — se devuelve tal cual para que la pantalla lo
   * muestre en vez de un texto genérico fijo.
   */
  async aprobar(id: number | string, comentario?: string): Promise<{ message?: string }> {
    const response = await apiClient.post(`/rh/solicitudes/${id}/aprobar`, comentario ? { comentario } : undefined);
    return response.data as { message?: string };
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
  async actualizarEstado(id: number | string, estado: 'en_revision' | 'cerrada', comentario?: string): Promise<{ message?: string }> {
    const response = await apiClient.patch(`/rh/solicitudes/${id}/estado`, comentario ? { estado, comentario } : { estado });
    return response.data as { message?: string };
  },
};
