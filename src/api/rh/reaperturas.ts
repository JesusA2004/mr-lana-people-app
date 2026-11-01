import { apiClient } from '../client';

/** `POST /rh/reaperturas/{tipo}/{id}`: mismo `ReaperturaService` que la web. */
export const reaperturasApi = {
  async reabrir(tipo: string, id: number, motivo: string): Promise<void> {
    await apiClient.post(`/rh/reaperturas/${encodeURIComponent(tipo)}/${id}`, { motivo });
  },
};
