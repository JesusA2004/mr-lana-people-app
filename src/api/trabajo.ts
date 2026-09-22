import { apiClient, extractData } from './client';
import { normalizePersona } from './normalizers/cicloLaboral';
import { normalizeEquipoPendientes, normalizeEvaluacion, normalizeTarea, normalizeTareasConteos, normalizeVistoBueno } from './normalizers/trabajo';

import type { PersonaResumen } from '@/types/cicloLaboral';
import type { AutorizarEvaluacionPayload, CapturarEvaluacionPayload, Evaluacion } from '@/types/evaluation';
import type { Tarea, TareasConteos, TareasEstadoFiltro } from '@/types/task';
import type { EquipoPendientes, VistoBuenoResult } from '@/types/team';
import { asArray, asRecord, normalizePaginated, type Paginated } from '@/utils/normalize';

/**
 * Vista de jefe — `EquipoController`. La autoridad es la jerarquía real
 * (`jefe_id`/`gerente_id`); un 403 del visto bueno significa que la
 * cuenta no es jefe/gerente de ese colaborador.
 */
export const equipoApi = {
  async list(): Promise<PersonaResumen[]> {
    const response = await apiClient.get('/equipo');
    return asArray(extractData<unknown>(response.data))
      .map(normalizePersona)
      .filter((p): p is PersonaResumen => p !== null);
  },

  async pendientes(): Promise<EquipoPendientes> {
    const response = await apiClient.get('/equipo/pendientes');
    return normalizeEquipoPendientes(extractData<unknown>(response.data));
  },

  async vistoBueno(solicitudId: number | string, aprobado: boolean, comentario?: string | null): Promise<VistoBuenoResult> {
    const response = await apiClient.post(`/equipo/solicitudes/${solicitudId}/visto-bueno`, {
      aprobado,
      ...(comentario ? { comentario } : {}),
    });
    return normalizeVistoBueno(extractData<unknown>(response.data));
  },
};

export interface EvaluacionesParams {
  estado?: string;
  page?: number;
  per_page?: number;
}

/** Evaluación de periodo de prueba — `EvaluacionController` + `EvaluacionPeriodoPruebaPolicy`. */
export const evaluacionesApi = {
  async list(params: EvaluacionesParams = {}): Promise<Paginated<Evaluacion>> {
    const response = await apiClient.get('/evaluaciones', { params });
    return normalizePaginated(response.data, normalizeEvaluacion);
  },

  async get(id: number | string): Promise<Evaluacion> {
    const response = await apiClient.get(`/evaluaciones/${id}`);
    return normalizeEvaluacion(extractData<unknown>(response.data));
  },

  async capturar(id: number | string, payload: CapturarEvaluacionPayload): Promise<Evaluacion> {
    const response = await apiClient.post(`/evaluaciones/${id}/capturar`, payload);
    return normalizeEvaluacion(extractData<unknown>(response.data));
  },

  async autorizar(id: number | string, payload: AutorizarEvaluacionPayload): Promise<Evaluacion> {
    const response = await apiClient.post(`/evaluaciones/${id}/autorizar`, payload);
    return normalizeEvaluacion(extractData<unknown>(response.data));
  },

  async devolver(id: number | string, motivo: string): Promise<Evaluacion> {
    const response = await apiClient.post(`/evaluaciones/${id}/devolver`, { motivo });
    return normalizeEvaluacion(extractData<unknown>(response.data));
  },
};

export interface TareasParams {
  estado?: TareasEstadoFiltro;
  tipo?: string;
  page?: number;
  per_page?: number;
}

export interface TareasPage extends Paginated<Tarea> {
  conteos: TareasConteos;
}

/** Bandeja de trabajo — `TareaController` + `TareaRhPolicy`. */
export const tareasApi = {
  async list(params: TareasParams = {}): Promise<TareasPage> {
    const response = await apiClient.get('/tareas', { params });
    const page = normalizePaginated(response.data, normalizeTarea);
    return { ...page, conteos: normalizeTareasConteos(asRecord(asRecord(response.data).meta).conteos) };
  },

  async leer(id: number | string): Promise<Tarea> {
    const response = await apiClient.post(`/tareas/${id}/leer`);
    return normalizeTarea(extractData<unknown>(response.data));
  },

  async resolver(id: number | string): Promise<Tarea> {
    const response = await apiClient.post(`/tareas/${id}/resolver`);
    return normalizeTarea(extractData<unknown>(response.data));
  },
};
