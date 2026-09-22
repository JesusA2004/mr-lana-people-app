import type {
  AltaChecklist,
  ContratoLaboral,
  DocumentoContractual,
  EstadoAlta,
  EstadoDocumental,
  ExpedienteDocumentoEstado,
  Jerarquia,
  MiExpediente,
  PersonaOrganigrama,
  PersonaResumen,
} from '@/types/cicloLaboral';
import { ESTADOS_ALTA } from '@/types/cicloLaboral';
import {
  asArray,
  asBoolean,
  asId,
  asNumber,
  asRecord,
  asRecordOrNull,
  asString,
  asStringArray,
} from '@/utils/normalize';

export function normalizeEstadoAlta(value: unknown): EstadoAlta | null {
  return typeof value === 'string' && (ESTADOS_ALTA as readonly string[]).includes(value) ? (value as EstadoAlta) : null;
}

function normalizeExpedienteDocumento(value: unknown): ExpedienteDocumentoEstado {
  const raw = asRecord(value);
  return {
    document_type_id: asId(raw.document_type_id) ?? 0,
    clave: asString(raw.clave),
    nombre: asString(raw.nombre) ?? 'Documento',
    categoria: asString(raw.categoria),
    obligatorio: raw.obligatorio === undefined ? true : asBoolean(raw.obligatorio),
    estado: asString(raw.estado) ?? 'pendiente',
    documento_id: asId(raw.documento_id),
    version: asNumber(raw.version),
    cargado_en: asString(raw.cargado_en),
    validado_en: asString(raw.validado_en),
    motivo_rechazo: asString(raw.motivo_rechazo),
    observaciones: asString(raw.observaciones),
  };
}

export function normalizeEstadoDocumental(value: unknown): EstadoDocumental {
  const raw = asRecord(value);
  return {
    requeridos: asNumber(raw.requeridos) ?? 0,
    entregados: asNumber(raw.entregados) ?? 0,
    aprobados: asNumber(raw.aprobados) ?? 0,
    en_revision: asNumber(raw.en_revision) ?? 0,
    rechazados: asNumber(raw.rechazados) ?? 0,
    faltantes: asNumber(raw.faltantes) ?? 0,
    porcentaje: asNumber(raw.porcentaje) ?? 0,
    // Nunca se deduce "completo" de los archivos cargados: solo el flag del backend.
    completo: asBoolean(raw.completo),
    documentos: asArray(raw.documentos).map(normalizeExpedienteDocumento),
  };
}

export function normalizeMiExpediente(value: unknown): MiExpediente {
  const raw = asRecord(value);
  return {
    estado_alta: normalizeEstadoAlta(raw.estado_alta),
    estado_alta_etiqueta: asString(raw.estado_alta_etiqueta),
    expediente: normalizeEstadoDocumental(raw.expediente),
    expediente_cerrado: asBoolean(raw.expediente_cerrado),
  };
}

export function normalizeContrato(value: unknown): ContratoLaboral {
  const raw = asRecord(value);
  return {
    id: asId(raw.id) ?? 0,
    colaborador_id: asId(raw.colaborador_id),
    colaborador: asString(raw.colaborador),
    tipo: asString(raw.tipo) ?? '',
    tipo_etiqueta: asString(raw.tipo_etiqueta) ?? asString(raw.tipo) ?? 'Contrato',
    estado: asString(raw.estado) ?? '',
    fecha_inicio: asString(raw.fecha_inicio),
    fecha_fin: asString(raw.fecha_fin),
    dias_para_vencer: asNumber(raw.dias_para_vencer),
    sueldo_mensual: asNumber(raw.sueldo_mensual),
    documento_id: asId(raw.documento_id),
    documento_firmado: asBoolean(raw.documento_firmado),
    contrato_anterior_id: asId(raw.contrato_anterior_id),
    aviso_vencimiento_en: asString(raw.aviso_vencimiento_en),
    evaluacion_id: asId(raw.evaluacion_id),
  };
}

function normalizeDocumentoContractual(value: unknown): DocumentoContractual {
  const raw = asRecord(value);
  return {
    id: asId(raw.id) ?? 0,
    clave: asString(raw.clave),
    titulo: asString(raw.titulo),
    estado: asString(raw.estado),
    firmado: asBoolean(raw.firmado),
  };
}

export function normalizeAlta(value: unknown): AltaChecklist {
  const raw = asRecord(value);
  const estructura = asRecord(raw.estructura);
  const acceso = asRecord(raw.acceso);
  const contrato = asRecordOrNull(raw.contrato);
  return {
    estado_alta: normalizeEstadoAlta(raw.estado_alta),
    estado_alta_etiqueta: asString(raw.estado_alta_etiqueta),
    estatus: asString(raw.estatus),
    estructura: {
      empresa: asString(estructura.empresa),
      sucursal: asString(estructura.sucursal),
      departamento: asString(estructura.departamento),
      puesto: asString(estructura.puesto),
      jefe_inmediato: asString(estructura.jefe_inmediato),
      gerente: asString(estructura.gerente),
      sueldo_mensual: asNumber(estructura.sueldo_mensual),
      fecha_ingreso: asString(estructura.fecha_ingreso),
      tipo_contratacion: asString(estructura.tipo_contratacion),
      periodo_prueba_inicio: asString(estructura.periodo_prueba_inicio),
      periodo_prueba_fin: asString(estructura.periodo_prueba_fin),
    },
    expediente: normalizeEstadoDocumental(raw.expediente),
    contrato: contrato ? normalizeContrato(contrato) : null,
    documentos_contractuales: asArray(raw.documentos_contractuales).map(normalizeDocumentoContractual),
    documentos_contractuales_sin_plantilla: asStringArray(raw.documentos_contractuales_sin_plantilla),
    acceso: {
      tiene_cuenta: asBoolean(acceso.tiene_cuenta),
      bloqueado: asBoolean(acceso.bloqueado),
    },
  };
}

/** `resumen()` regresa `[]` (no `null`) para una persona ausente — se trata igual que `null`. */
export function normalizePersona(value: unknown): PersonaResumen | null {
  const raw = asRecordOrNull(value);
  if (!raw) return null;
  const id = asId(raw.id);
  if (id === null) return null;
  return {
    id,
    nombre: asString(raw.nombre) ?? '',
    numero_empleado: asString(raw.numero_empleado),
    puesto: asString(raw.puesto),
    departamento: asString(raw.departamento),
    sucursal: asString(raw.sucursal),
    empresa: asString(raw.empresa),
  };
}

export function normalizeJerarquia(value: unknown): Jerarquia {
  const raw = asRecord(value);
  return {
    colaborador: normalizePersona(raw.colaborador),
    jefe_inmediato: normalizePersona(raw.jefe_inmediato),
    gerente: normalizePersona(raw.gerente),
    subordinados_directos: asArray(raw.subordinados_directos)
      .map(normalizePersona)
      .filter((p): p is PersonaResumen => p !== null),
  };
}

export function normalizeOrganigramaPersona(value: unknown): PersonaOrganigrama | null {
  const persona = normalizePersona(value);
  if (!persona) return null;
  return {
    ...persona,
    subordinados: asArray(asRecord(value).subordinados)
      .map(normalizeOrganigramaPersona)
      .filter((p): p is PersonaOrganigrama => p !== null),
  };
}
