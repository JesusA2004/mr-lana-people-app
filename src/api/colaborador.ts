import type { AxiosProgressEvent } from 'axios';

import { apiClient, extractData } from './client';
import { appendFile, multipartHeaders, type LocalUploadFile } from './upload';

import type { CollaboratorProfile, DashboardData, FotoPerfilEstado, SubirFotoRespuesta } from '@/types/collaborator';
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

  /** Estado de la foto propia (sin foto / oficial / cambio pendiente + última decisión de RH). */
  async getEstadoFoto(): Promise<FotoPerfilEstado> {
    const response = await apiClient.get('/colaborador/foto/estado');
    return extractData<FotoPerfilEstado>(response.data);
  },

  /**
   * Sube la foto propia. Sin foto oficial queda oficial al instante (200);
   * con foto oficial queda como propuesta para RH (202) y la actual sigue.
   */
  async subirFoto(file: LocalUploadFile, onProgress?: (percent: number) => void): Promise<SubirFotoRespuesta> {
    const formData = new FormData();
    appendFile(formData, 'foto', file);
    const response = await apiClient.post('/colaborador/foto', formData, {
      headers: multipartHeaders,
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return response.data as SubirFotoRespuesta;
  },
};
