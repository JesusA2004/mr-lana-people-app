import { apiClient, extractData } from './client';

import type { CreateSolicitudPayload, Solicitud } from '@/types/request';

export const solicitudesApi = {
  async getAll(): Promise<Solicitud[]> {
    const response = await apiClient.get('/solicitudes');
    return extractData<Solicitud[]>(response.data);
  },

  async getById(id: number | string): Promise<Solicitud> {
    const response = await apiClient.get(`/solicitudes/${id}`);
    return extractData<Solicitud>(response.data);
  },

  async create(payload: CreateSolicitudPayload): Promise<Solicitud> {
    const response = await apiClient.post('/solicitudes', payload);
    return extractData<Solicitud>(response.data);
  },
};
