import { apiClient, extractData } from '../client';

import type { Celebracion, RhAniversarioFila, TipoCelebracion } from '@/types/celebracion';

export interface RhAniversariosParams {
  desde?: string;
  hasta?: string;
  /** Días desde hoy si no se manda `desde`/`hasta` — igual que la web (default 30). */
  dias?: number;
  empresa_id?: number | string;
  sucursal_id?: number | string;
  departamento_id?: number | string;
  q?: string;
}

export interface RhAniversariosResponse {
  data: RhAniversarioFila[];
  meta: { desde: string; hasta: string };
}

/**
 * Acciones de RH sobre celebraciones (`App\Http\Controllers\Api\V1\Rh\
 * CelebracionController`). Aniversario laboral SOLO existe aquí — no hay
 * bandeja RH "clásica" equivalente (a diferencia de cumpleaños, que
 * conserva `src/api/rh/cumpleanos.ts`).
 */
export const rhCelebracionesApi = {
  /** `GET /rh/celebraciones/aniversarios` — sin paginar, un arreglo por rango de fechas (igual que la web). */
  async aniversarios(params: RhAniversariosParams = {}): Promise<RhAniversariosResponse> {
    const response = await apiClient.get('/rh/celebraciones/aniversarios', { params });
    return response.data as RhAniversariosResponse;
  },

  /** `GET /rh/celebraciones/{colaborador}/{tipo}` — evento del día (lo crea si le toca hoy); 422 si hoy no aplica. */
  async evento(colaboradorId: number | string, tipo: TipoCelebracion): Promise<Celebracion> {
    const response = await apiClient.get(`/rh/celebraciones/${colaboradorId}/${tipo}`);
    return extractData<Celebracion>(response.data);
  },

  /** Enviar la felicitación directamente al homenajeado. */
  async enviar(colaboradorId: number | string, tipo: TipoCelebracion): Promise<{ message?: string }> {
    const response = await apiClient.post(`/rh/celebraciones/${colaboradorId}/${tipo}/enviar`);
    return response.data as { message?: string };
  },

  /** Avisar a todos (una sola vez por evento) — `throttle:10,1` en el backend. */
  async avisarATodos(colaboradorId: number | string, tipo: TipoCelebracion): Promise<{ message?: string; avisado: boolean; destinatarios: number }> {
    const response = await apiClient.post(`/rh/celebraciones/${colaboradorId}/${tipo}/avisar-todos`);
    return response.data as { message?: string; avisado: boolean; destinatarios: number };
  },
};
