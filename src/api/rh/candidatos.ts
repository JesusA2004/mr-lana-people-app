import { apiClient, extractData } from '../client';
import { normalizeCandidatoFicha, normalizeCandidatoFila } from '../normalizers/rhCandidato';
import { appendFile, multipartHeaders, type LocalUploadFile } from '../upload';

import type {
  CandidatoFicha,
  CandidatoFila,
  DescartarPayload,
  EvaluarFiltroPayload,
  RegistrarEntrevistaPayload,
  RegistrarReferenciaPayload,
  RegistrarSocioeconomicoPayload,
} from '@/types/rhCandidato';
import { normalizePaginated, type Paginated } from '@/utils/normalize';

/**
 * Reclutamiento — `/api/v1/rh/candidatos/*` (permiso `candidatos.*`, alcance
 * organizacional). Mismo `CandidatoWorkflowService` que la web: cada acción
 * responde la ficha completa (`{candidato, ciclo}`) ya recalculada, nunca se
 * actualiza el estado localmente a mano.
 */
export interface RhCandidatosParams {
  busqueda?: string;
  estado?: string;
  sucursal_id?: number;
  vacante_id?: number;
  puesto_objetivo_id?: number;
  page?: number;
  per_page?: number;
}

export const rhCandidatosApi = {
  async list(params: RhCandidatosParams = {}): Promise<Paginated<CandidatoFila>> {
    const response = await apiClient.get('/rh/candidatos', { params });
    return normalizePaginated(response.data, normalizeCandidatoFila);
  },

  async get(id: number | string): Promise<CandidatoFicha> {
    const response = await apiClient.get(`/rh/candidatos/${id}`);
    return normalizeCandidatoFicha(extractData<unknown>(response.data));
  },

  async evaluarPerfil(id: number | string, payload: EvaluarFiltroPayload): Promise<CandidatoFicha> {
    const response = await apiClient.post(`/rh/candidatos/${id}/perfil`, payload);
    return normalizeCandidatoFicha(extractData<unknown>(response.data));
  },

  async registrarEntrevista(id: number | string, payload: RegistrarEntrevistaPayload): Promise<CandidatoFicha> {
    const response = await apiClient.post(`/rh/candidatos/${id}/entrevista`, payload);
    return normalizeCandidatoFicha(extractData<unknown>(response.data));
  },

  async enviarPsicometricas(id: number | string, link: string): Promise<CandidatoFicha> {
    const response = await apiClient.post(`/rh/candidatos/${id}/psicometricas/enviar`, { link });
    return normalizeCandidatoFicha(extractData<unknown>(response.data));
  },

  async resultadosPsicometricas(id: number | string, resumen: string, archivos: LocalUploadFile[]): Promise<CandidatoFicha> {
    const formData = new FormData();
    formData.append('resumen', resumen);
    archivos.forEach((archivo, index) => appendFile(formData, `archivos[${index}]`, archivo));
    const response = await apiClient.post(`/rh/candidatos/${id}/psicometricas/resultados`, formData, { headers: multipartHeaders });
    return normalizeCandidatoFicha(extractData<unknown>(response.data));
  },

  async revisarPsicometricas(id: number | string, payload: EvaluarFiltroPayload): Promise<CandidatoFicha> {
    const response = await apiClient.post(`/rh/candidatos/${id}/psicometricas/revision`, payload);
    return normalizeCandidatoFicha(extractData<unknown>(response.data));
  },

  async registrarSocioeconomico(id: number | string, payload: RegistrarSocioeconomicoPayload, evidencias: LocalUploadFile[]): Promise<CandidatoFicha> {
    const formData = new FormData();
    formData.append('fecha_visita', payload.fecha_visita);
    formData.append('direccion', payload.direccion);
    formData.append('resultado', payload.resultado);
    if (payload.riesgos) formData.append('riesgos', payload.riesgos);
    if (payload.observaciones) formData.append('observaciones', payload.observaciones);
    if (payload.visitador_user_id) formData.append('visitador_user_id', String(payload.visitador_user_id));
    if (payload.checklist) {
      Object.entries(payload.checklist).forEach(([clave, valor]) => {
        if (valor !== undefined) formData.append(`checklist[${clave}]`, typeof valor === 'boolean' ? (valor ? '1' : '0') : String(valor));
      });
    }
    evidencias.forEach((archivo, index) => appendFile(formData, `evidencias[${index}]`, archivo));
    const response = await apiClient.post(`/rh/candidatos/${id}/socioeconomico`, formData, { headers: multipartHeaders });
    return normalizeCandidatoFicha(extractData<unknown>(response.data));
  },

  async registrarReferencia(id: number | string, payload: RegistrarReferenciaPayload): Promise<CandidatoFicha> {
    const response = await apiClient.post(`/rh/candidatos/${id}/referencias`, payload);
    return normalizeCandidatoFicha(extractData<unknown>(response.data));
  },

  async concluirReferencias(id: number | string, payload: EvaluarFiltroPayload): Promise<CandidatoFicha> {
    const response = await apiClient.post(`/rh/candidatos/${id}/referencias/concluir`, payload);
    return normalizeCandidatoFicha(extractData<unknown>(response.data));
  },

  async preautorizar(id: number | string, comentario?: string | null): Promise<CandidatoFicha> {
    const response = await apiClient.post(`/rh/candidatos/${id}/preautorizar`, { comentario: comentario || null });
    return normalizeCandidatoFicha(extractData<unknown>(response.data));
  },

  async autorizarRh(id: number | string, comentario?: string | null): Promise<CandidatoFicha> {
    const response = await apiClient.post(`/rh/candidatos/${id}/autorizar`, { comentario: comentario || null });
    return normalizeCandidatoFicha(extractData<unknown>(response.data));
  },

  async rechazarRh(id: number | string, motivo: string): Promise<CandidatoFicha> {
    const response = await apiClient.post(`/rh/candidatos/${id}/rechazar`, { motivo });
    return normalizeCandidatoFicha(extractData<unknown>(response.data));
  },

  async devolverRh(id: number | string, motivo: string): Promise<CandidatoFicha> {
    const response = await apiClient.post(`/rh/candidatos/${id}/devolver`, { motivo });
    return normalizeCandidatoFicha(extractData<unknown>(response.data));
  },

  async descartar(id: number | string, payload: DescartarPayload): Promise<CandidatoFicha> {
    const response = await apiClient.post(`/rh/candidatos/${id}/descartar`, payload);
    return normalizeCandidatoFicha(extractData<unknown>(response.data));
  },
};
