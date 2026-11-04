import type {
  AccionPasoGuia,
  DestinoPasoGuia,
  EstadoExpedienteIncompleto,
  EstadoPasoGuia,
  GrupoPasoGuia,
  GuiaColaborador,
  MotivoBloqueoExpediente,
  PasoGuia,
} from '@/types/guia';
import { asArray, asBoolean, asNumber, asRecord, asRecordOrNull, asString, asStringArray } from '@/utils/normalize';

const DESTINOS: readonly DestinoPasoGuia[] = [
  'completar-datos',
  'foto',
  'documento',
  'induccion',
  'induccion-documento',
  'induccion-video',
  'induccion-evaluacion',
  'documento-laboral',
  'descriptivo-puesto',
];
const ESTADOS: readonly EstadoPasoGuia[] = ['hecho', 'en_revision', 'pendiente', 'rechazado', 'espera'];
const GRUPOS: readonly GrupoPasoGuia[] = ['datos', 'foto', 'documentos', 'induccion', 'firmas'];

function normalizeAccion(raw: unknown): AccionPasoGuia | null {
  const r = asRecordOrNull(raw);
  const destino = asString(r?.app);
  // Un destino desconocido (backend más nuevo) no se navega: el botón se oculta.
  if (!r || !destino || !(DESTINOS as readonly string[]).includes(destino)) return null;
  const params: Record<string, number | string> = {};
  for (const [clave, valor] of Object.entries(asRecord(r.params))) {
    if (typeof valor === 'number' || typeof valor === 'string') params[clave] = valor;
  }
  return { etiqueta: asString(r.etiqueta) ?? 'Continuar', destino: destino as DestinoPasoGuia, params };
}

export function normalizePasoGuia(raw: unknown): PasoGuia | null {
  const r = asRecord(raw);
  const titulo = asString(r.titulo);
  if (!titulo) return null;
  const estado = asString(r.estado);
  const grupo = asString(r.grupo);

  return {
    clave: asString(r.clave) ?? titulo,
    grupo: grupo && (GRUPOS as readonly string[]).includes(grupo) ? (grupo as GrupoPasoGuia) : 'documentos',
    titulo,
    descripcion: asString(r.descripcion) ?? '',
    estado: estado && (ESTADOS as readonly string[]).includes(estado) ? (estado as EstadoPasoGuia) : 'pendiente',
    estadoEtiqueta: asString(r.estado_etiqueta) ?? 'Pendiente',
    motivo: asString(r.motivo),
    detalle: asStringArray(r.detalle),
    accion: normalizeAccion(r.accion),
    bloqueaApp: asBoolean(r.bloquea_app),
  };
}

function normalizeMotivo(raw: unknown): MotivoBloqueoExpediente | null {
  const r = asRecord(raw);
  const titulo = asString(r.titulo);
  if (!titulo) return null;
  return { clave: asString(r.clave) ?? titulo, titulo, detalle: asStringArray(r.detalle), conteo: asNumber(r.conteo) ?? 0 };
}

/** `expediente_incompleto` (bootstrap / 423). Ausente (backend anterior) = sin bloqueo. */
export function normalizeEstadoExpediente(raw: unknown): EstadoExpedienteIncompleto {
  const r = asRecord(raw);
  return {
    aplica: asBoolean(r.aplica),
    bloqueado: asBoolean(r.bloqueado),
    mensaje: asString(r.mensaje),
    motivos: asArray(r.motivos)
      .map(normalizeMotivo)
      .filter((m): m is MotivoBloqueoExpediente => m !== null),
    datosFaltantes: asNumber(r.datos_faltantes) ?? 0,
    documentosPorSubir: asNumber(r.documentos_por_subir) ?? 0,
    documentosRechazados: asNumber(r.documentos_rechazados) ?? 0,
  };
}

export function normalizeGuia(raw: unknown): GuiaColaborador {
  const r = asRecord(raw);
  const resumen = asRecord(r.resumen);
  const induccion = asRecord(r.induccion);
  const pasos = asArray(r.pasos)
    .map(normalizePasoGuia)
    .filter((p): p is PasoGuia => p !== null);

  return {
    pasos,
    siguiente: r.siguiente ? normalizePasoGuia(r.siguiente) : null,
    resumen: {
      total: asNumber(resumen.total) ?? pasos.length,
      hechos: asNumber(resumen.hechos) ?? 0,
      enRevision: asNumber(resumen.en_revision) ?? 0,
      porHacer: asNumber(resumen.por_hacer) ?? 0,
      enEspera: asNumber(resumen.en_espera) ?? 0,
      todoListo: asBoolean(resumen.todo_listo),
    },
    induccion: {
      activa: asBoolean(induccion.activa),
      estado: asString(induccion.estado) ?? 'sin_asignar',
      porcentaje: asNumber(induccion.porcentaje) ?? 0,
    },
    bloqueo: normalizeEstadoExpediente(r.bloqueo),
  };
}
