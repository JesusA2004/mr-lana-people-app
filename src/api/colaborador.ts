import { apiClient, extractData } from './client';

import type { CollaboratorProfile, DashboardData } from '@/types/collaborator';
import type { NotificationItem } from '@/types/notification';
import type { CreateSolicitudPayload, Solicitud } from '@/types/request';
import type { VacationBalance } from '@/types/vacation';

/**
 * Endpoints bajo el namespace /colaborador. `getPerfil` y `getDashboard`
 * alimentan las pantallas de Perfil y Dashboard respectivamente. Los demás
 * quedan disponibles porque están documentados como endpoints existentes,
 * aunque las pantallas de Vacaciones/Solicitudes/Notificaciones usan los
 * namespaces dedicados (`vacacionesApi`, `solicitudesApi`, `notificacionesApi`).
 */
export const colaboradorApi = {
  async getPerfil(): Promise<CollaboratorProfile> {
    const response = await apiClient.get('/colaborador/perfil');
    return extractData<CollaboratorProfile>(response.data);
  },

  async getDashboard(): Promise<DashboardData> {
    const response = await apiClient.get('/colaborador/dashboard');
    return extractData<DashboardData>(response.data);
  },

  async getVacaciones(): Promise<VacationBalance> {
    const response = await apiClient.get('/colaborador/vacaciones');
    return extractData<VacationBalance>(response.data);
  },

  async getSolicitudes(): Promise<Solicitud[]> {
    const response = await apiClient.get('/colaborador/solicitudes');
    return extractData<Solicitud[]>(response.data);
  },

  async createSolicitud(payload: CreateSolicitudPayload): Promise<Solicitud> {
    const response = await apiClient.post('/colaborador/solicitudes', payload);
    return extractData<Solicitud>(response.data);
  },

  async getNotificaciones(): Promise<NotificationItem[]> {
    const response = await apiClient.get('/colaborador/notificaciones');
    return extractData<NotificationItem[]>(response.data);
  },
};
