import type {
  Reingreso,
  ReingresoCandidatoBusqueda,
  ReingresoDocumentoRequerido,
  ReingresoHistorial,
  ReingresoHistorialContrato,
  ReingresoHistorialEvaluacion,
  ReingresoHistorialSalida,
} from '@/types/rhReingreso';
import { asArray, asBoolean, asId, asNumber, asRecord, asRecordOrNull, asString } from '@/utils/normalize';

function normalizeAccion(value: unknown) {
  const raw = asRecord(value);
  return { clave: asString(raw.clave) ?? '', etiqueta: asString(raw.etiqueta) ?? '', tipo: asString(raw.tipo) ?? 'secundaria' };
}

function normalizeAprobacion(value: unknown) {
  const raw = asRecord(value);
  return {
    nivel: asString(raw.nivel) ?? '',
    etiqueta: asString(raw.etiqueta) ?? '',
    estado: asString(raw.estado) ?? 'pendiente',
    aprobadores: asArray(raw.aprobadores).filter((v): v is string => typeof v === 'string'),
    decidio: asString(raw.decidio),
    comentario: asString(raw.comentario),
    fecha: asString(raw.fecha),
  };
}

export function normalizeReingresoBusqueda(value: unknown): ReingresoCandidatoBusqueda {
  const raw = asRecord(value);
  return {
    id: asId(raw.id) ?? 0,
    nombre: asString(raw.nombre) ?? '',
    numero_empleado: asString(raw.numero_empleado),
    curp: asString(raw.curp),
    rfc: asString(raw.rfc),
    puesto: asString(raw.puesto),
    sucursal: asString(raw.sucursal),
    estatus: asString(raw.estatus) ?? '',
    dado_de_baja: asBoolean(raw.dado_de_baja),
    fecha_baja: asString(raw.fecha_baja),
    causa_salida: asString(raw.causa_salida),
    reingreso_abierto: asBoolean(raw.reingreso_abierto),
  };
}

function normalizeSalida(value: unknown): ReingresoHistorialSalida {
  const raw = asRecord(value);
  return { id: asId(raw.id) ?? 0, causa: asString(raw.causa) ?? '', motivo: asString(raw.motivo), fecha_efectiva: asString(raw.fecha_efectiva) ?? '', estado: asString(raw.estado) ?? '' };
}

function normalizeContratoHist(value: unknown): ReingresoHistorialContrato {
  const raw = asRecord(value);
  return { id: asId(raw.id) ?? 0, tipo: asString(raw.tipo) ?? '', inicio: asString(raw.inicio) ?? '', fin: asString(raw.fin), estado: asString(raw.estado) ?? '' };
}

function normalizeEvaluacionHist(value: unknown): ReingresoHistorialEvaluacion {
  const raw = asRecord(value);
  return { id: asId(raw.id) ?? 0, calificacion: asNumber(raw.calificacion) };
}

export function normalizeReingresoHistorial(value: unknown): ReingresoHistorial {
  const raw = asRecord(value);
  const colaborador = asRecord(raw.colaborador);
  return {
    colaborador: {
      id: asId(colaborador.id) ?? 0,
      nombre: asString(colaborador.nombre) ?? '',
      numero_empleado: asString(colaborador.numero_empleado),
      puesto: asString(colaborador.puesto),
      sucursal: asString(colaborador.sucursal),
      fecha_ingreso: asString(colaborador.fecha_ingreso),
      fecha_baja: asString(colaborador.fecha_baja),
      estatus: asString(colaborador.estatus) ?? '',
    },
    salidas: asArray(raw.salidas).map(normalizeSalida),
    contratos: asArray(raw.contratos).map(normalizeContratoHist),
    evaluaciones: asArray(raw.evaluaciones).map(normalizeEvaluacionHist),
  };
}

function normalizeDocumentoRequerido(value: unknown): ReingresoDocumentoRequerido {
  const raw = asRecord(value);
  return { id: asId(raw.id) ?? 0, nombre: asString(raw.nombre) ?? undefined };
}

export function normalizeReingreso(value: unknown): Reingreso {
  const raw = asRecord(value);
  const colaborador = asRecordOrNull(raw.colaborador);
  return {
    id: asId(raw.id) ?? 0,
    colaborador: colaborador
      ? { id: asId(colaborador.id) ?? 0, nombre: asString(colaborador.nombre) ?? '', numero_empleado: asString(colaborador.numero_empleado) }
      : null,
    estado: asString(raw.estado) ?? '',
    estado_etiqueta: asString(raw.estado_etiqueta),
    motivo: asString(raw.motivo),
    puesto: asString(raw.puesto),
    sucursal: asString(raw.sucursal),
    tipo_contratacion: asString(raw.tipo_contratacion),
    fecha_reingreso: asString(raw.fecha_reingreso),
    documentos_requeridos: asArray(raw.documentos_requeridos).map(normalizeDocumentoRequerido),
    comentario_decision: asString(raw.comentario_decision),
    solicitado_por: asString(raw.solicitado_por),
    decidido_por: asString(raw.decidido_por),
    decidido_en: asString(raw.decidido_en),
    completado_en: asString(raw.completado_en),
    creado_en: asString(raw.creado_en),
    aprobaciones: asArray(raw.aprobaciones).map(normalizeAprobacion),
    acciones_permitidas: asArray(raw.acciones_permitidas).map(normalizeAccion),
  };
}
