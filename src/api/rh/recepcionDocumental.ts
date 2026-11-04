import { apiClient, extractData } from '../client';

import type {
  CorteRecepcion,
  CorteRecepcionDetalle,
  EstadoRenglonRecepcion,
  MarcarRecepcionPayload,
  MarcarRecepcionRespuesta,
  MetricasRecepcion,
  ReglaRecepcion,
  RenglonRecepcion,
  SucursalRecepcion,
} from '@/types/recepcionDocumental';
import { asArray, asBoolean, asId, asNumber, asRecord, asRecordOrNull, asString, normalizePaginated, type Paginated } from '@/utils/normalize';

const ESTADOS: readonly EstadoRenglonRecepcion[] = ['pendiente', 'recibido', 'recibido_con_observacion', 'no_recibido', 'no_aplica'];

export function normalizeMetricasRecepcion(value: unknown): MetricasRecepcion {
  const m = asRecord(value);
  const n = (clave: string) => asNumber(m[clave]) ?? 0;
  return {
    esperados: n('esperados'),
    recibidos: n('recibidos'),
    pendientes: n('pendientes'),
    no_recibidos: n('no_recibidos'),
    incidencias: n('incidencias'),
    no_aplica: n('no_aplica'),
    renglones: n('renglones'),
    cumplimiento: n('cumplimiento'),
  };
}

export function normalizeCorteRecepcion(value: unknown): CorteRecepcion {
  const c = asRecord(value);
  return {
    id: asId(c.id) ?? 0,
    periodo: asString(c.periodo) ?? '',
    etiqueta: asString(c.etiqueta) ?? asString(c.periodo) ?? 'Periodo',
    fecha_inicio: asString(c.fecha_inicio),
    fecha_fin: asString(c.fecha_fin),
    estado: asString(c.estado) ?? '',
    estado_etiqueta: asString(c.estado_etiqueta) ?? '',
    cerrado_en: asString(c.cerrado_en),
    cerrado_por: asString(c.cerrado_por),
    metricas: normalizeMetricasRecepcion(c.metricas),
  };
}

function normalizeSucursal(value: unknown): SucursalRecepcion {
  const s = asRecord(value);
  return { sucursal_id: asId(s.sucursal_id), nombre: asString(s.nombre) ?? 'Sin sucursal', metricas: normalizeMetricasRecepcion(s.metricas) };
}

function normalizeRegla(value: unknown): ReglaRecepcion {
  const r = asRecord(value);
  return {
    regla: asString(r.regla) ?? '',
    etiqueta: asString(r.etiqueta) ?? asString(r.regla) ?? '',
    orden: asNumber(r.orden) ?? 99,
    activa: asBoolean(r.activa),
    sin_eventos: asString(r.sin_eventos) ?? 'Sin documentos esperados en este periodo.',
    metricas: normalizeMetricasRecepcion(r.metricas),
  };
}

export function normalizeCorteDetalle(value: unknown): CorteRecepcionDetalle {
  const raw = asRecord(value);
  const agrupaciones = asRecord(raw.agrupaciones);
  const permisos = asRecord(raw.permisos);
  return {
    ...normalizeCorteRecepcion(raw),
    sucursales_con_pendientes: asArray(raw.sucursales_con_pendientes).map(normalizeSucursal),
    sucursales: asArray(agrupaciones.sucursales).map(normalizeSucursal),
    reglas: asArray(agrupaciones.reglas)
      .map(normalizeRegla)
      .filter((r) => r.regla !== '')
      .sort((a, b) => a.orden - b.orden),
    // Ausente = no (el backend vuelve a autorizar cada PATCH).
    permisos: {
      recibir: permisos.recibir === true,
      observar: permisos.observar === true,
      cerrar: permisos.cerrar === true,
      reabrir: permisos.reabrir === true,
      descargar_pdf: permisos.descargar_pdf === true,
    },
  };
}

export function normalizeRenglonRecepcion(value: unknown): RenglonRecepcion {
  const r = asRecord(value);
  const colaborador = asRecord(r.colaborador);
  const sucursal = asRecord(r.sucursal);
  const origen = asRecord(r.origen);
  const documento = asRecordOrNull(r.documento_digital);
  const estado = asString(r.estado);
  return {
    id: asId(r.id) ?? 0,
    corte_id: asId(r.corte_id) ?? 0,
    regla: asString(r.regla) ?? '',
    regla_etiqueta: asString(r.regla_etiqueta) ?? '',
    regla_orden: asNumber(r.regla_orden) ?? 99,
    tipo_documento: asString(r.tipo_documento) ?? '',
    tipo_etiqueta: asString(r.tipo_etiqueta) ?? 'Documento',
    origen: { tipo: asString(origen.tipo) ?? '', id: asId(origen.id) },
    colaborador: {
      id: asId(colaborador.id),
      nombre: asString(colaborador.nombre) ?? 'Sin nombre',
      numero_empleado: asString(colaborador.numero_empleado),
      puesto: asString(colaborador.puesto),
    },
    sucursal: { id: asId(sucursal.id), nombre: asString(sucursal.nombre) ?? 'Sin sucursal' },
    fecha_evento: asString(r.fecha_evento),
    evento_descripcion: asString(r.evento_descripcion),
    cantidad_esperada: asNumber(r.cantidad_esperada) ?? 1,
    cantidad_recibida: asNumber(r.cantidad_recibida) ?? 0,
    estado: ESTADOS.includes(estado as EstadoRenglonRecepcion) ? (estado as EstadoRenglonRecepcion) : 'pendiente',
    estado_etiqueta: asString(r.estado_etiqueta) ?? '',
    justificacion: asString(r.justificacion),
    observaciones: asString(r.observaciones),
    no_aplica_automatico: asBoolean(r.no_aplica_automatico),
    recibido_en: asString(r.recibido_en),
    recibido_por: asString(r.recibido_por),
    incidencia: asBoolean(r.incidencia),
    documento_digital: documento ? { id: asId(documento.id) ?? 0, titulo: asString(documento.titulo), estado: asString(documento.estado) } : null,
  };
}

/** Filtros de `GET /{corte}/renglones` (los mismos que la web). `sucursal_id: 'sin'` = sin sucursal. */
export interface FiltrosRenglones {
  sucursal_id?: number | 'sin';
  regla?: string;
  estado?: EstadoRenglonRecepcion;
  recibido?: 'si' | 'no';
  colaborador?: string;
}

/** `/api/v1/rh/recepcion-documental` — mismo `RecepcionDocumentalService` y Policies que la web. */
export const rhRecepcionApi = {
  async cortes(page = 1): Promise<Paginated<CorteRecepcion>> {
    const response = await apiClient.get('/rh/recepcion-documental', { params: { page } });
    return normalizePaginated(response.data, normalizeCorteRecepcion);
  },

  async corte(id: number | string): Promise<CorteRecepcionDetalle> {
    const response = await apiClient.get(`/rh/recepcion-documental/${id}`);
    return normalizeCorteDetalle(extractData<unknown>(response.data));
  },

  async renglones(corteId: number | string, filtros: FiltrosRenglones, page = 1): Promise<Paginated<RenglonRecepcion>> {
    const response = await apiClient.get(`/rh/recepcion-documental/${corteId}/renglones`, { params: { ...filtros, page } });
    return normalizePaginated(response.data, normalizeRenglonRecepcion);
  },

  async marcar(renglonId: number, payload: MarcarRecepcionPayload): Promise<MarcarRecepcionRespuesta> {
    const response = await apiClient.patch(`/rh/recepcion-documental/renglones/${renglonId}`, payload);
    const data = asRecord(extractData<unknown>(response.data));
    const estadoCorte = asRecordOrNull(data.estado_corte);
    return {
      renglon: normalizeRenglonRecepcion(data.renglon),
      metricas: normalizeMetricasRecepcion(data.metricas),
      estado_corte: estadoCorte ? { value: asString(estadoCorte.value) ?? '', label: asString(estadoCorte.label) ?? '' } : null,
    };
  },
};
