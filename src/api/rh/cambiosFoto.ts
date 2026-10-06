import { apiClient } from '../client';

import type { RhCambioFoto } from '@/types/rh';

/**
 * Cambios de foto de perfil por revisar (`App\Http\Controllers\Api\V1\Rh\CambioFotoController`,
 * permiso `expedientes.revisar` + alcance organizacional). Aprobar convierte
 * la propuesta en foto oficial; rechazar conserva la actual y avisa el motivo.
 */
export const rhCambiosFotoApi = {
  async list(): Promise<RhCambioFoto[]> {
    const response = await apiClient.get('/rh/cambios-foto');
    return (response.data?.data ?? []) as RhCambioFoto[];
  },

  async aprobar(id: number): Promise<void> {
    await apiClient.post(`/rh/cambios-foto/${id}/aprobar`);
  },

  async rechazar(id: number, motivo: string): Promise<void> {
    await apiClient.post(`/rh/cambios-foto/${id}/rechazar`, { motivo });
  },
};
