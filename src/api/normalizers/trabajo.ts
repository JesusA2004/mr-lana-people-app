import type { Evaluacion, EvaluacionCriterio } from '@/types/evaluation';
import type { Tarea, TareasConteos } from '@/types/task';
import type { EquipoPendientes, VistoBuenoResult } from '@/types/team';
import { normalizeContrato } from './cicloLaboral';
import {
  asArray,
  asBoolean,
  asId,
  asNullableBoolean,
  asNumber,
  asRecord,
  asRecordOrNull,
  asString,
  asStringArray,
  normalizeColaboradorRef,
} from '@/utils/normalize';

export function normalizeEquipoPendientes(value: unknown): EquipoPendientes {
  const raw = asRecord(value);
  return {
    solicitudes: asArray(raw.solicitudes).map((item) => {
      const s = asRecord(item);
      return {
        id: asId(s.id) ?? 0,
        folio: asString(s.folio),
        tipo: asString(s.tipo) ?? '',
        tipo_etiqueta: asString(s.tipo_etiqueta),
        estado: asString(s.estado) ?? '',
        colaborador: asString(s.colaborador),
        fecha_inicio: asString(s.fecha_inicio),
        fecha_fin: asString(s.fecha_fin),
        monto_solicitado: asNumber(s.monto_solicitado),
        requiere_visto_bueno: asBoolean(s.requiere_visto_bueno),
        visto_bueno: asString(s.visto_bueno),
        creada_en: asString(s.creada_en),
      };
    }),
    evaluaciones: asArray(raw.evaluaciones).map((item) => {
      const e = asRecord(item);
      return {
        id: asId(e.id) ?? 0,
        colaborador: asString(e.colaborador) ?? '',
        estado: asString(e.estado) ?? '',
        fecha_limite: asString(e.fecha_limite),
      };
    }),
  };
}

export function normalizeVistoBueno(value: unknown): VistoBuenoResult {
  const raw = asRecord(value);
  return {
    solicitud_id: asId(raw.solicitud_id) ?? 0,
    decision: asString(raw.decision),
    estado_solicitud: asString(raw.estado_solicitud),
  };
}

function normalizeCriterio(value: unknown): EvaluacionCriterio {
  const raw = asRecord(value);
  return {
    criterio: asString(raw.criterio) ?? '',
    calificacion: asNumber(raw.calificacion),
    comentario: asString(raw.comentario),
  };
}

export function normalizeEvaluacion(value: unknown): Evaluacion {
  const raw = asRecord(value);
  const contrato = asRecordOrNull(raw.contrato);
  return {
    id: asId(raw.id) ?? 0,
    colaborador: normalizeColaboradorRef(raw.colaborador),
    contrato: contrato ? normalizeContrato(contrato) : null,
    estado: asString(raw.estado) ?? '',
    estado_etiqueta: asString(raw.estado_etiqueta),
    fecha_limite: asString(raw.fecha_limite),
    fecha_evaluacion: asString(raw.fecha_evaluacion),
    criterios: asArray(raw.criterios).map(normalizeCriterio),
    criterios_sugeridos: asStringArray(raw.criterios_sugeridos),
    calificacion: asNumber(raw.calificacion),
    resultado: asString(raw.resultado),
    recomienda_renovar: asNullableBoolean(raw.recomienda_renovar),
    observaciones: asString(raw.observaciones),
    decision_renovar: asNullableBoolean(raw.decision_renovar),
    comentario_autorizacion: asString(raw.comentario_autorizacion),
    autorizada_en: asString(raw.autorizada_en),
    contrato_renovacion_id: asId(raw.contrato_renovacion_id),
  };
}

export function normalizeTarea(value: unknown): Tarea {
  const raw = asRecord(value);
  return {
    id: asId(raw.id) ?? 0,
    tipo: asString(raw.tipo) ?? '',
    tipo_etiqueta: asString(raw.tipo_etiqueta),
    titulo: asString(raw.titulo) ?? asString(raw.tipo_etiqueta) ?? 'Pendiente',
    descripcion: asString(raw.descripcion),
    prioridad: asString(raw.prioridad) ?? 'media',
    accion: asString(raw.accion),
    related_type: asString(raw.related_type),
    related_id: asId(raw.related_id),
    colaborador: normalizeColaboradorRef(raw.colaborador),
    vence_en: asString(raw.vence_en),
    read_at: asString(raw.read_at),
    resolved_at: asString(raw.resolved_at),
    creada_en: asString(raw.creada_en),
    datos: asRecordOrNull(raw.datos),
  };
}

export function normalizeTareasConteos(value: unknown): TareasConteos {
  const raw = asRecord(value);
  return {
    abiertas: asNumber(raw.abiertas) ?? 0,
    no_leidas: asNumber(raw.no_leidas) ?? 0,
    vencidas: asNumber(raw.vencidas) ?? 0,
  };
}
