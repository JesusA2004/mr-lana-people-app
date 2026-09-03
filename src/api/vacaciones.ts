import { apiClient, extractData } from './client';

import type { CreateVacationRequestPayload, VacationBalance, VacationRequest } from '@/types/vacation';

export const vacacionesApi = {
  async getSaldo(): Promise<VacationBalance> {
    const response = await apiClient.get('/vacaciones/saldo');
    return extractData<VacationBalance>(response.data);
  },

  async getSolicitudes(): Promise<VacationRequest[]> {
    const response = await apiClient.get('/vacaciones/solicitudes');
    return extractData<VacationRequest[]>(response.data);
  },

  async createSolicitud(payload: CreateVacationRequestPayload): Promise<VacationRequest> {
    const response = await apiClient.post('/vacaciones/solicitudes', payload);
    return extractData<VacationRequest>(response.data);
  },
};
