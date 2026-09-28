import { apiClient, extractData } from '../client';

import type { RhBirthdayDetail, RhBirthdayListResponse, RhBirthdayPeriodo } from '@/types/rhBirthday';

export interface RhCumpleanosParams {
  periodo?: RhBirthdayPeriodo;
  mes?: number;
  /** El backend real (`Rh\CumpleanosController::index`) todavía no lee este parámetro — se manda igual por si lo agrega, Laravel ignora query params desconocidos sin error. */
  anio?: number;
  sucursal_id?: number | string;
  departamento_id?: number | string;
  q?: string;
  page?: number;
  per_page?: number;
}

/**
 * `GET /api/v1/rh/cumpleanos[...]` — permiso `rh.cumpleanos.ver`, acotado
 * por alcance organizacional (espejo EXACTO de
 * `App\Http\Controllers\Api\V1\Rh\CumpleanosController` en capacitaciones,
 * confirmado contra el código fuente real).
 */
export const rhCumpleanosApi = {
  async list(params: RhCumpleanosParams = {}): Promise<RhBirthdayListResponse> {
    const response = await apiClient.get('/rh/cumpleanos', { params });
    return response.data as RhBirthdayListResponse;
  },

  /** Detalle — destino real del push `{"type":"rh_cumpleanos","resource_id":<greeting_id>}`. */
  async getById(greetingId: number | string): Promise<RhBirthdayDetail> {
    const response = await apiClient.get(`/rh/cumpleanos/${greetingId}`);
    return extractData<RhBirthdayDetail>(response.data);
  },

  /** Imagen de la tarjeta de felicitación (streaming autenticado, Bearer) — usar con `<Image>` + headers, nunca descargar a mano. */
  imagenPath(greetingId: number | string): string {
    return `/rh/cumpleanos/${greetingId}/imagen`;
  },

  /** Foto de perfil del colaborador (por colaborador, no por greeting). */
  fotoPath(colaboradorId: number | string): string {
    return `/rh/cumpleanos/${colaboradorId}/foto`;
  },

  /**
   * El envío manual de felicitación NO tiene ruta en `Rh\CumpleanosController`
   * (confirmado contra `routes/api.php` @ `capacitaciones@cc4beeb`) — solo
   * existe en el panel web. La acción real y equivalente ya está disponible
   * vía el sistema unificado de celebraciones: ver
   * `rhCelebracionesApi.enviar(colaboradorId, 'cumpleanos')` en
   * `src/api/rh/celebraciones.ts`, usada por
   * `src/app/(app)/rh/cumpleanos/[id].tsx`.
   */
};
