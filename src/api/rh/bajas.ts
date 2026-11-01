import { apiClient, extractData } from '../client';
import { normalizeSiguientePaso } from '../normalizers/siguientePaso';

import type { BajaDetalle, BajaFila } from '@/types/rhBaja';
import { asArray, asBoolean, asId, asNumber, asRecord, asString, normalizePaginated, type Paginated } from '@/utils/normalize';

export function normalizeBajaFila(value: unknown): BajaFila {
  const raw = asRecord(value);
  return {
    id: asId(raw.id) ?? 0,
    folio: asString(raw.folio),
    colaborador: asString(raw.colaborador) ?? 'Colaborador',
    numero_empleado: asString(raw.numero_empleado),
    sucursal: asString(raw.sucursal),
    puesto: asString(raw.puesto),
    forma_etiqueta: asString(raw.forma_etiqueta),
    causal: asString(raw.causal),
    estatus: asString(raw.estatus) ?? '',
    estatus_etiqueta: asString(raw.estatus_etiqueta),
    fecha_baja: asString(raw.fecha_baja),
    dias_en_espera: asNumber(raw.dias_en_espera),
    documentos_faltantes: asNumber(raw.documentos_faltantes) ?? 0,
  };
}

export function normalizeBajaDetalle(value: unknown): BajaDetalle {
  const raw = asRecord(value);
  return {
    ...normalizeBajaFila(raw),
    fecha_ingreso: asString(raw.fecha_ingreso),
    causal_nombre: asString(raw.causal_nombre),
    comentarios: asString(raw.comentarios),
    recontratable_etiqueta: asString(raw.recontratable_etiqueta),
    solicitado_por: asString(raw.solicitado_por),
    documentos: asArray(raw.documentos).map((item) => {
      const d = asRecord(item);
      return { id: asId(d.id), nombre: asString(d.nombre) ?? 'Documento', obligatorio: asBoolean(d.obligatorio), cumplido: asBoolean(d.cumplido) };
    }),
    bitacora: asArray(raw.bitacora).map((item) => {
      const b = asRecord(item);
      return { id: asId(b.id) ?? 0, accion: asString(b.accion_etiqueta) ?? asString(b.accion) ?? '', motivo: asString(b.motivo), usuario: asString(b.usuario), fecha: asString(b.fecha) };
    }),
    siguiente_paso: normalizeSiguientePaso(raw.siguiente_paso),
  };
}

/** `GET /rh/bajas` es un paginador de Laravel sin envoltura `meta`. */
export function normalizeBajasPagina(payload: unknown): Paginated<BajaFila> {
  const root = asRecord(payload);
  return normalizePaginated({ data: root.data, meta: root.meta ?? root }, normalizeBajaFila);
}

/**
 * Bajas (mismo `BajaService` que la web). Para Jurídico y Contraloría es solo
 * consulta: el alcance lo decide `BajaConsultaService` en el backend.
 */
export const rhBajasApi = {
  async list(params: { estatus?: string; page?: number; per_page?: number } = {}): Promise<Paginated<BajaFila>> {
    const response = await apiClient.get('/rh/bajas', { params });
    return normalizeBajasPagina(response.data);
  },

  async get(id: number | string): Promise<BajaDetalle> {
    const response = await apiClient.get(`/rh/bajas/${id}`);
    return normalizeBajaDetalle(extractData<unknown>(response.data));
  },
};
