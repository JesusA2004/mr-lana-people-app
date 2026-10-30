import { apiClient, extractData } from './client';
import { normalizeAgendaEvento, normalizeAgendaGuardado, normalizeAgendaListado, normalizeAgendaOpciones } from './normalizers/agenda';
import { appendFile, multipartHeaders, type LocalUploadFile } from './upload';

import type { AgendaEvento, AgendaGuardado, AgendaListado, AgendaOpciones, AgendarPayload, ReprogramarPayload, ResultadoEntrevistaPayload, ResultadoSocioeconomicoPayload } from '@/types/agenda';

/**
 * «Mi agenda» — `/api/v1/agenda/*` (permisos `agenda.*` + alcance). Mismos
 * Services que el portal: los resultados avanzan al candidato por su workflow,
 * nunca se actualiza su estado aquí.
 */
export const agendaApi = {
  async listar(): Promise<AgendaListado> {
    const response = await apiClient.get('/agenda');
    return normalizeAgendaListado(response.data);
  },

  async opciones(): Promise<AgendaOpciones> {
    const response = await apiClient.get('/agenda/opciones');
    return normalizeAgendaOpciones(extractData<unknown>(response.data));
  },

  async get(id: number | string): Promise<AgendaEvento> {
    const response = await apiClient.get(`/agenda/${id}`);
    return normalizeAgendaEvento(extractData<unknown>(response.data));
  },

  /** `clave_idempotencia` hace que un reintento devuelva la misma cita. */
  async agendar(payload: AgendarPayload, cv?: LocalUploadFile | null): Promise<AgendaGuardado> {
    if (!cv) {
      const response = await apiClient.post('/agenda', payload);
      return normalizeAgendaGuardado(response.data);
    }
    const formData = new FormData();
    Object.entries(payload).forEach(([campo, valor]) => {
      if (campo === 'candidato_nuevo' && valor && typeof valor === 'object') {
        Object.entries(valor).forEach(([sub, texto]) => {
          if (texto) formData.append(`candidato_nuevo[${sub}]`, String(texto));
        });
      } else if (valor !== undefined && valor !== null && valor !== '') {
        formData.append(campo, String(valor));
      }
    });
    appendFile(formData, 'cv', cv);
    const response = await apiClient.post('/agenda', formData, { headers: multipartHeaders });
    return normalizeAgendaGuardado(response.data);
  },

  /** Responde la cita NUEVA: la pantalla navega a su id. */
  async reprogramar(id: number | string, payload: ReprogramarPayload): Promise<AgendaGuardado> {
    const response = await apiClient.post(`/agenda/${id}/reprogramar`, payload);
    return normalizeAgendaGuardado(response.data);
  },

  async cancelar(id: number | string, motivo: string): Promise<AgendaEvento> {
    const response = await apiClient.post(`/agenda/${id}/cancelar`, { motivo });
    return normalizeAgendaEvento(extractData<unknown>(response.data));
  },

  async noAsistio(id: number | string, comentario?: string): Promise<AgendaEvento> {
    const response = await apiClient.post(`/agenda/${id}/no-asistio`, { comentario: comentario || null });
    return normalizeAgendaEvento(extractData<unknown>(response.data));
  },

  async resultadoEntrevista(id: number | string, payload: ResultadoEntrevistaPayload): Promise<AgendaEvento> {
    const response = await apiClient.post(`/agenda/${id}/resultado-entrevista`, payload);
    return normalizeAgendaEvento(extractData<unknown>(response.data));
  },

  async resultadoSocioeconomico(id: number | string, payload: ResultadoSocioeconomicoPayload, evidencias: LocalUploadFile[]): Promise<AgendaEvento> {
    const formData = new FormData();
    formData.append('resultado', payload.resultado);
    if (payload.comentario) formData.append('comentario', payload.comentario);
    evidencias.forEach((archivo, index) => appendFile(formData, `evidencias[${index}]`, archivo));
    const response = await apiClient.post(`/agenda/${id}/resultado-socioeconomico`, formData, { headers: multipartHeaders });
    return normalizeAgendaEvento(extractData<unknown>(response.data));
  },

  cvPath(id: number | string): string {
    return `/agenda/${id}/cv`;
  },
};
