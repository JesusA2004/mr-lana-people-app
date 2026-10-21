import { apiClient, extractData } from './client';

import type { EstadoRegistro } from '@/types/registro';

/**
 * Registro completo antes de entrar (cuenta creada con el QR de
 * incorporación) — `App\Http\Controllers\Api\V1\RegistroAppController`.
 * Los documentos se suben con `documentosApi.upload` (mismo endpoint del
 * checklist de incorporación).
 */
export const registroApi = {
  async estado(): Promise<EstadoRegistro> {
    const response = await apiClient.get('/colaborador/registro');
    return extractData<EstadoRegistro>(response.data);
  },

  /** Guarda un paso del asistente (solo los campos que la persona puede capturar). */
  async guardarDatos(datos: Record<string, string>, datosMedicos?: { condicion_medica?: string; alergias?: string }): Promise<EstadoRegistro> {
    const response = await apiClient.post('/colaborador/registro/datos', {
      ...(Object.keys(datos).length > 0 ? { datos } : {}),
      ...(datosMedicos ? { datos_medicos: datosMedicos } : {}),
    });
    return extractData<EstadoRegistro>(response.data);
  },

  /** Cierra el registro (el backend vuelve a verificar datos y documentos). */
  async finalizar(): Promise<EstadoRegistro> {
    const response = await apiClient.post('/colaborador/registro/finalizar');
    return extractData<EstadoRegistro>(response.data);
  },
};
