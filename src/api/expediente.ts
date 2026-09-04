import { apiClient, extractData } from './client';

import type { ExpedienteResponse } from '@/types/expediente';

/**
 * `GET /api/v1/colaborador/expediente` — pendiente en backend (ver
 * docs/MOBILE_BACKEND_REQUIREMENTS.md P0.1). El contrato se definió leyendo
 * `App\Services\Expedientes\ExpedienteService` y
 * `Rh\ExpedienteController::documentosParaVista()` en capacitaciones: no se
 * inventó, solo se expone lo que el backend ya calcula.
 */
export const expedienteApi = {
  async get(): Promise<ExpedienteResponse> {
    const response = await apiClient.get('/colaborador/expediente');
    return extractData<ExpedienteResponse>(response.data);
  },
};
