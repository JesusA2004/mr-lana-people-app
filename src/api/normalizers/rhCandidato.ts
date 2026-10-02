import type {
  CandidatoAccion,
  CandidatoDetalle,
  CandidatoEntrevista,
  CandidatoEvidencia,
  CandidatoFicha,
  CandidatoFila,
  CandidatoInvitacion,
  CandidatoPsicometrica,
  CandidatoReferencia,
  CandidatoSocioeconomico,
  CicloAprobacionResumen,
  CicloPaso,
  CicloTimelineEvento,
  EstadoCiclo,
} from '@/types/rhCandidato';
import { asArray, asBoolean, asId, asNumber, asRecord, asRecordOrNull, asString } from '@/utils/normalize';

export function normalizeCandidatoFila(value: unknown): CandidatoFila {
  const raw = asRecord(value);
  return {
    id: asId(raw.id) ?? 0,
    nombre_completo: asString(raw.nombre_completo) ?? '',
    puesto_objetivo: asString(raw.puesto_objetivo),
    sucursal: asString(raw.sucursal),
    estado: asString(raw.estado) ?? '',
    estado_etiqueta: asString(raw.estado_etiqueta),
    etapa_maxima: asNumber(raw.etapa_maxima) ?? 0,
    creado_en: asString(raw.creado_en),
  };
}

function normalizeAccion(value: unknown): CandidatoAccion {
  const raw = asRecord(value);
  return {
    clave: asString(raw.clave) ?? '',
    etiqueta: asString(raw.etiqueta) ?? '',
    tipo: asString(raw.tipo) ?? 'secundaria',
  };
}

function normalizeEvidencia(value: unknown): CandidatoEvidencia {
  const raw = asRecord(value);
  return {
    id: asId(raw.id) ?? 0,
    tipo: asString(raw.tipo) ?? '',
    tipo_etiqueta: asString(raw.tipo_etiqueta),
    nombre: asString(raw.nombre),
    mime: asString(raw.mime),
    tamano: asNumber(raw.tamano),
    subida_en: asString(raw.subida_en),
  };
}

function normalizeEntrevista(value: unknown): CandidatoEntrevista {
  const raw = asRecord(value);
  return {
    id: asId(raw.id) ?? 0,
    realizada_en: asString(raw.realizada_en) ?? '',
    entrevistador: asString(raw.entrevistador),
    resultado: asString(raw.resultado) ?? '',
    resultado_etiqueta: asString(raw.resultado_etiqueta),
    observaciones: asString(raw.observaciones),
  };
}

function normalizePsicometrica(value: unknown): CandidatoPsicometrica {
  const raw = asRecord(value);
  return {
    id: asId(raw.id) ?? 0,
    link: asString(raw.link),
    enviada_en: asString(raw.enviada_en),
    resultados_en: asString(raw.resultados_en),
    resumen_resultados: asString(raw.resumen_resultados),
    revision_resultado: asString(raw.revision_resultado),
    revision_observaciones: asString(raw.revision_observaciones),
    revisada_en: asString(raw.revisada_en),
    evidencias: asArray(raw.evidencias).map(normalizeEvidencia),
  };
}

function normalizeSocioeconomico(value: unknown): CandidatoSocioeconomico {
  const raw = asRecord(value);
  return {
    id: asId(raw.id) ?? 0,
    fecha_visita: asString(raw.fecha_visita) ?? '',
    visitador: asString(raw.visitador),
    direccion: asString(raw.direccion) ?? '',
    checklist: asRecord(raw.checklist),
    riesgos: asString(raw.riesgos),
    observaciones: asString(raw.observaciones),
    resultado: asString(raw.resultado) ?? '',
    resultado_etiqueta: asString(raw.resultado_etiqueta),
    evidencias: asArray(raw.evidencias).map(normalizeEvidencia),
  };
}

function normalizeReferencia(value: unknown): CandidatoReferencia {
  const raw = asRecord(value);
  return {
    id: asId(raw.id) ?? 0,
    empresa: asString(raw.empresa) ?? '',
    contacto: asString(raw.contacto) ?? '',
    telefono: asString(raw.telefono),
    relacion_puesto: asString(raw.relacion_puesto),
    resultado: asString(raw.resultado) ?? '',
    resultado_etiqueta: asString(raw.resultado_etiqueta),
    observaciones: asString(raw.observaciones),
    fecha_validacion: asString(raw.fecha_validacion) ?? '',
    validada_por: asString(raw.validada_por),
  };
}

function normalizeInvitacion(value: unknown): CandidatoInvitacion | null {
  const raw = asRecordOrNull(value);
  const id = raw ? asId(raw.id) : null;
  if (!raw || id === null) return null;
  return {
    id,
    estado: asString(raw.estado) ?? '',
    estado_etiqueta: asString(raw.estado_etiqueta),
    expira_en: asString(raw.expira_en) ?? '',
    usada_en: asString(raw.usada_en),
  };
}

export function normalizeCandidatoDetalle(value: unknown): CandidatoDetalle {
  const raw = asRecord(value);
  return {
    id: asId(raw.id) ?? 0,
    nombre: asString(raw.nombre) ?? '',
    apellidos: asString(raw.apellidos),
    nombre_completo: asString(raw.nombre_completo) ?? '',
    telefono: asString(raw.telefono),
    correo: asString(raw.correo),
    fuente: asString(raw.fuente),
    campana: asString(raw.campana),
    empresa: asString(raw.empresa),
    sucursal: asString(raw.sucursal),
    sucursal_id: asId(raw.sucursal_id),
    departamento: asString(raw.departamento),
    puesto: asString(raw.puesto),
    puesto_objetivo_id: asId(raw.puesto_objetivo_id),
    vacante_id: asId(raw.vacante_id),
    empresa_id: asId(raw.empresa_id),
    departamento_id: asId(raw.departamento_id),
    responsable_rh_id: asId(raw.responsable_rh_id),
    gerente_involucrado_id: asId(raw.gerente_involucrado_id),
    responsable_rh: asString(raw.responsable_rh),
    gerente: asString(raw.gerente),
    observaciones: asString(raw.observaciones),
    estado: asString(raw.estado) ?? '',
    estado_etiqueta: asString(raw.estado_etiqueta),
    motivo_salida: asString(raw.motivo_salida),
    tiene_cv: asBoolean(raw.tiene_cv),
    colaborador_id: asId(raw.colaborador_id),
    creado_en: asString(raw.creado_en),
    contratado_en: asString(raw.contratado_en),
    entrevistas: asArray(raw.entrevistas).map(normalizeEntrevista),
    psicometricas: asArray(raw.psicometricas).map(normalizePsicometrica),
    socioeconomicos: asArray(raw.socioeconomicos).map(normalizeSocioeconomico),
    referencias: asArray(raw.referencias).map(normalizeReferencia),
    invitacion: normalizeInvitacion(raw.invitacion),
  };
}

function normalizePaso(value: unknown): CicloPaso {
  const raw = asRecord(value);
  return { clave: asString(raw.clave) ?? '', etiqueta: asString(raw.etiqueta) ?? '', estado: asString(raw.estado) ?? 'pendiente' };
}

function normalizeAprobacion(value: unknown): CicloAprobacionResumen {
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

function normalizeTimelineEvento(value: unknown): CicloTimelineEvento {
  const raw = asRecord(value);
  return {
    fecha: asString(raw.fecha),
    titulo: asString(raw.titulo) ?? asString(raw.evento) ?? '',
    descripcion: asString(raw.descripcion),
    actor: asString(raw.actor) ?? asString(raw.usuario),
  };
}

export function normalizeEstadoCiclo(value: unknown): EstadoCiclo {
  const raw = asRecord(value);
  const persona = asRecordOrNull(raw.persona);
  const etapa = asRecordOrNull(raw.etapa);
  const estado = asRecordOrNull(raw.estado);
  const responsable = asRecordOrNull(raw.responsable_actual);
  const siguiente = asRecordOrNull(raw.siguiente_accion);

  return {
    persona: persona && asId(persona.id) !== null
      ? { tipo: asString(persona.tipo) ?? '', id: asId(persona.id) as number, nombre: asString(persona.nombre) ?? '', puesto: asString(persona.puesto), sucursal: asString(persona.sucursal) }
      : null,
    etapa: etapa ? { clave: asString(etapa.clave) ?? '', etiqueta: asString(etapa.etiqueta) ?? '' } : null,
    estado: estado ? { clave: asString(estado.clave) ?? '', etiqueta: asString(estado.etiqueta) ?? '' } : null,
    progreso: asNumber(raw.progreso) ?? 0,
    responsable_actual: responsable ? { rol: asString(responsable.rol) ?? '', nombre: asString(responsable.nombre) } : null,
    siguiente_accion: siguiente ? { clave: asString(siguiente.clave) ?? '', etiqueta: asString(siguiente.etiqueta) ?? '' } : null,
    fecha_desde_estado: asString(raw.fecha_desde_estado),
    bloqueos: asArray(raw.bloqueos).filter((v): v is string => typeof v === 'string'),
    pasos: asArray(raw.pasos).map(normalizePaso),
    aprobaciones: asArray(raw.aprobaciones).map(normalizeAprobacion),
    timeline: asArray(raw.timeline).map(normalizeTimelineEvento),
    acciones_permitidas: asArray(raw.acciones_permitidas).map(normalizeAccion),
  };
}

export function normalizeCandidatoFicha(value: unknown): CandidatoFicha {
  const raw = asRecord(value);
  return {
    candidato: normalizeCandidatoDetalle(raw.candidato),
    ciclo: normalizeEstadoCiclo(raw.ciclo),
  };
}
