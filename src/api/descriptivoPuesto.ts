import { apiClient, extractData } from './client';
import { normalizeAcuseDescriptivo } from './normalizers/descriptivoPuesto';

import type { AcuseDescriptivoPuesto } from '@/types/descriptivoPuesto';

/**
 * Mi descriptivo de puesto — `App\Http\Controllers\Api\V1\DescriptivoPuestoColaboradorController`.
 * RH lo envía tras aprobar la inducción; el colaborador lo lee y confirma
 * «OK, enterado» con su comentario (el servidor exige las dos cosas).
 */
export const descriptivoPuestoApi = {
  async actual(): Promise<AcuseDescriptivoPuesto | null> {
    const response = await apiClient.get('/colaborador/descriptivo-puesto');
    return normalizeAcuseDescriptivo(extractData<unknown>(response.data));
  },

  async marcarLeido(acuseId: number): Promise<AcuseDescriptivoPuesto | null> {
    const response = await apiClient.post(`/colaborador/descriptivo-puesto/${acuseId}/leido`);
    return normalizeAcuseDescriptivo(extractData<unknown>(response.data));
  },

  async acusar(acuseId: number, comentario: string): Promise<AcuseDescriptivoPuesto | null> {
    const response = await apiClient.post(`/colaborador/descriptivo-puesto/${acuseId}/acusar`, { enterado: true, comentario });
    return normalizeAcuseDescriptivo(extractData<unknown>(response.data));
  },
};
