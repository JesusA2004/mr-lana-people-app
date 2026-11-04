import { apiClient, extractData } from './client';
import { normalizarEstadoSolicitud } from './normalizers/solicitudEmpleo';

import type { EstadoSolicitudEmpleo, GuardarSeccionSolicitud } from '@/types/solicitudEmpleo';

/**
 * Solicitud de empleo + Estudio socioeconómico dentro del registro
 * (`App\Http\Controllers\Api\V1\SolicitudEmpleoRegistroController`). Siempre
 * de la cuenta en sesión. La cabecera `X-People-Solicitud-Empleo: 1` va en
 * todas las llamadas (ver `apiClient`): con ella el backend exige la
 * solicitud completa para cerrar el registro.
 */
export const solicitudEmpleoApi = {
  async estado(): Promise<EstadoSolicitudEmpleo> {
    const response = await apiClient.get('/colaborador/registro/solicitud');
    return normalizarEstadoSolicitud(extractData(response.data));
  },

  /** Guardado PARCIAL de una sección (nada se exige al guardar; la completitud la calcula el backend). */
  async guardarSeccion(seccion: string, cuerpo: GuardarSeccionSolicitud): Promise<EstadoSolicitudEmpleo> {
    const response = await apiClient.post(`/colaborador/registro/solicitud/${encodeURIComponent(seccion)}`, cuerpo);
    return normalizarEstadoSolicitud(extractData(response.data));
  },
};
