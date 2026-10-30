import type { AgendaDia, AgendaEvento, AgendaGuardado, AgendaHistorial, AgendaListado, AgendaMotivo, AgendaOpciones, AgendaPuede } from '@/types/agenda';
import { asArray, asBoolean, asId, asRecord, asString, asStringArray } from '@/utils/normalize';

/** Bandera ausente = no: un permiso nunca se asume. */
function normalizePuede(value: unknown): AgendaPuede {
  const raw = asRecord(value);
  return {
    gestionar: raw.gestionar === true,
    registrar_resultado: raw.registrar_resultado === true,
    ver_datos_candidato: raw.ver_datos_candidato === true,
    reprogramar: raw.reprogramar === true,
    cancelar: raw.cancelar === true,
    capturar: raw.capturar === true,
  };
}

function normalizeHistorial(value: unknown): AgendaHistorial {
  const raw = asRecord(value);
  return {
    accion: asString(raw.accion) ?? '',
    estado_nuevo: asString(raw.estado_nuevo),
    detalle: asString(raw.detalle),
    usuario: asString(raw.usuario),
    fecha: asString(raw.fecha),
  };
}

export function normalizeAgendaEvento(value: unknown): AgendaEvento {
  const raw = asRecord(value);
  const candidato = asRecord(raw.candidato);
  const sucursal = asRecord(raw.sucursal);
  return {
    id: asId(raw.id) ?? 0,
    tipo: asString(raw.tipo) ?? '',
    tipo_etiqueta: asString(raw.tipo_etiqueta) ?? '',
    fecha_hora: asString(raw.fecha_hora) ?? '',
    fecha: asString(raw.fecha) ?? '',
    hora: asString(raw.hora) ?? '',
    estado: asString(raw.estado) ?? '',
    estado_etiqueta: asString(raw.estado_etiqueta) ?? '',
    origen: asString(raw.origen) ?? '',
    origen_etiqueta: asString(raw.origen_etiqueta) ?? '',
    agendado_por: asString(raw.agendado_por),
    sucursal: { id: asId(sucursal.id) ?? 0, nombre: asString(sucursal.nombre) ?? '' },
    candidato: {
      id: asId(candidato.id) ?? 0,
      nombre: asString(candidato.nombre) ?? '',
      puesto: asString(candidato.puesto),
      estado: asString(candidato.estado),
      estado_etiqueta: asString(candidato.estado_etiqueta),
      telefono: asString(candidato.telefono),
      tiene_cv: candidato.tiene_cv === null || candidato.tiene_cv === undefined ? null : asBoolean(candidato.tiene_cv),
    },
    domicilio: asString(raw.domicilio),
    notas: asString(raw.notas),
    resultado: asString(raw.resultado),
    resultado_etiqueta: asString(raw.resultado_etiqueta),
    motivo_no_viable: asString(raw.motivo_no_viable),
    motivo_no_viable_etiqueta: asString(raw.motivo_no_viable_etiqueta),
    comentario_resultado: asString(raw.comentario_resultado),
    resultado_en: asString(raw.resultado_en),
    motivo_cancelacion: asString(raw.motivo_cancelacion),
    reprogramado_de_id: asId(raw.reprogramado_de_id),
    reprogramado_a_id: asId(raw.reprogramado_a_id),
    puede: normalizePuede(raw.puede),
    historial: Array.isArray(raw.historial) ? raw.historial.map(normalizeHistorial) : null,
  };
}

function normalizeDia(value: unknown): AgendaDia {
  const raw = asRecord(value);
  return { fecha: asString(raw.fecha) ?? '', eventos: asArray(raw.eventos).map(normalizeAgendaEvento) };
}

function normalizeMotivo(value: unknown): AgendaMotivo {
  const raw = asRecord(value);
  return { value: asString(raw.value) ?? '', etiqueta: asString(raw.etiqueta) ?? '' };
}

/** Cuerpo completo de `GET /agenda` (`data` + `meta`). */
export function normalizeAgendaListado(value: unknown): AgendaListado {
  const raw = asRecord(value);
  const data = asRecord(raw.data);
  const meta = asRecord(raw.meta);
  return {
    dias: asArray(data.dias).map(normalizeDia),
    motivos_no_viable: asArray(meta.motivos_no_viable).map(normalizeMotivo).filter((m) => m.value !== ''),
    puede_agendar: meta.puede_agendar === true,
    puede_alta_candidato: meta.puede_alta_candidato === true,
  };
}

export function normalizeAgendaOpciones(value: unknown): AgendaOpciones {
  const raw = asRecord(value);
  return {
    sucursales: asArray(raw.sucursales).map((s) => {
      const fila = asRecord(s);
      return { id: asId(fila.id) ?? 0, nombre: asString(fila.nombre) ?? '' };
    }),
    candidatos: asArray(raw.candidatos).map((c) => {
      const fila = asRecord(c);
      return { id: asId(fila.id) ?? 0, nombre: asString(fila.nombre) ?? '', puesto: asString(fila.puesto), sucursal_id: asId(fila.sucursal_id) };
    }),
  };
}

/** Cuerpo de `POST /agenda` y `/reprogramar`. */
export function normalizeAgendaGuardado(value: unknown): AgendaGuardado {
  const raw = asRecord(value);
  return {
    evento: normalizeAgendaEvento(raw.data),
    empalmes: asStringArray(raw.empalmes),
    repetido: raw.repetido === true,
  };
}
