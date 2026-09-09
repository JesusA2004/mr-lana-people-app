import { apiClient, extractData } from './client';

import type { IncorporacionResponse } from '@/types/incorporation';

/**
 * `GET /api/v1/colaborador/incorporacion` (alias `.../resumen`) —
 * `App\Http\Controllers\Api\V1\IncorporacionController::index()`. Único
 * endpoint real para el checklist de documentos del colaborador: cubre
 * tanto la pantalla de "Mi incorporación" como el tab "Expediente" (ver
 * capacitaciones/docs/API_MOVIL.md, "Incorporación documental" — el
 * backend no separa ambos conceptos en dos rutas).
 */
export const incorporacionApi = {
  async get(): Promise<IncorporacionResponse> {
    const response = await apiClient.get('/colaborador/incorporacion');
    return extractData<IncorporacionResponse>(response.data);
  },
};
