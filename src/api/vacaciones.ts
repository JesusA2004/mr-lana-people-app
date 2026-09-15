import { apiClient, extractData } from './client';

import type { VacationBalance } from '@/types/vacation';

/**
 * @deprecated MÓDULO LEGACY — NO USAR PARA CREAR NUEVAS SOLICITUDES.
 *
 * `/api/v1/vacaciones/*` escribe en la tabla legacy `solicitudes_vacaciones`
 * y el propio backend lo marca como "conservar hasta que la app móvil migre
 * por completo a solicitudes unificadas" (`routes/api.php`). Toda vacación
 * nueva se crea con `POST /api/v1/solicitudes` + `tipo: "vacaciones"` (ver
 * `solicitudesApi.create`).
 *
 * ÚNICA EXCEPCIÓN VIVA: `getSaldo()`. El saldo no existe todavía dentro del
 * módulo unificado y `VacacionesService::saldo()` ya suma los días de AMBOS
 * caminos (legacy + `solicitudes_internas` con `tipo=vacaciones`), así que
 * sigue siendo la cifra correcta para mostrar. Es lectura pura, nunca crea
 * nada. Gap D-4 en `docs/BACKEND_SYNC_2026_09_15.md`: cuando el backend
 * exponga el saldo dentro del módulo unificado, este archivo desaparece.
 */
export const vacacionesApi = {
  /**
   * `GET /api/v1/vacaciones/saldo` — SOLO LECTURA. Cuenta días de la tabla
   * legacy y de las solicitudes unificadas tipo `vacaciones`.
   */
  async getSaldo(): Promise<VacationBalance> {
    const response = await apiClient.get('/vacaciones/saldo');
    return extractData<VacationBalance>(response.data);
  },
};
