import type {
  ContenidoEvaluacionInduccion,
  EvaluacionInduccion,
  InduccionResumen,
  IntentoInduccion,
  PdfInduccion,
} from '@/types/induccion';
import { asArray, asBoolean, asId, asNullableBoolean, asNumber, asRecord, asRecordOrNull, asString, asStringArray } from '@/utils/normalize';

export function normalizeInduccionResumen(raw: unknown): InduccionResumen | null {
  const r = asRecordOrNull(raw);
  const avanceId = asId(r?.avance_id);
  if (!r || avanceId === null) return null;

  return {
    avanceId,
    titulo: asString(r.titulo) ?? 'Inducción Mr. Lana',
    totalPaginas: asNumber(r.total_paginas) ?? 0,
    paginasVistas: Array.isArray(r.paginas_vistas) ? r.paginas_vistas.map((p) => asNumber(p)).filter((p): p is number => p !== null) : [],
    ultimaPagina: asNumber(r.ultima_pagina),
    porcentaje: Math.max(0, Math.min(100, asNumber(r.porcentaje) ?? 0)),
    completado: asBoolean(r.completado),
  };
}

/** `data.pdf` del backend: {url, titulo, total_paginas}. La URL absoluta se reduce a ruta de API. */
export function normalizePdfInduccion(raw: unknown): PdfInduccion {
  const r = asRecord(raw);
  const url = asString(r.url) ?? '';
  const indice = url.indexOf('/api/v1/');
  return {
    path: indice >= 0 ? url.slice(indice + '/api/v1'.length) : '/induccion/pdf',
    titulo: asString(r.titulo) ?? 'Inducción Mr. Lana',
    totalPaginas: asNumber(r.total_paginas) ?? 0,
  };
}

function normalizeIntento(raw: unknown): IntentoInduccion | null {
  const r = asRecord(raw);
  const id = asId(r.id);
  if (id === null) return null;

  return {
    id,
    numero: asNumber(r.numero) ?? 1,
    presentadoEn: asString(r.presentado_en),
    pendienteCalificacionRh: asBoolean(r.pendiente_calificacion_rh),
    calificacionTotal: asNumber(r.calificacion_total),
    nivel: asString(r.nivel),
    nivelEtiqueta: asString(r.nivel_etiqueta),
    aprobado: asNullableBoolean(r.aprobado),
  };
}

export function normalizeEvaluacionInduccion(raw: unknown): EvaluacionInduccion | null {
  const r = asRecordOrNull(raw);
  const id = asId(r?.id);
  if (!r || id === null) return null;

  return {
    id,
    estado: asString(r.estado) ?? 'disponible',
    estadoEtiqueta: asString(r.estado_etiqueta) ?? '',
    intentosCount: asNumber(r.intentos_count) ?? 0,
    mejorCalificacion: asNumber(r.mejor_calificacion),
    fechaLimiteReevaluacion: asString(r.fecha_limite_reevaluacion),
    retroalimentacion: asString(r.retroalimentacion),
    puedePresentar: asBoolean(r.puede_presentar),
    intentos: asArray(r.intentos)
      .map(normalizeIntento)
      .filter((i): i is IntentoInduccion => i !== null),
  };
}

export function normalizeContenidoEvaluacion(raw: unknown): ContenidoEvaluacionInduccion {
  const r = asRecord(raw);
  const instrucciones = asRecord(r.instrucciones);
  const c = asRecord(r.seccion_c);
  const e = asRecord(r.seccion_e);
  const descripciones = asRecord(c.descripciones);

  return {
    version: asString(r.version) ?? '',
    totalPuntos: asNumber(instrucciones.total_puntos) ?? 30,
    calificacionAprobatoria: asNumber(instrucciones.calificacion_aprobatoria) ?? 24,
    seccionA: asArray(r.seccion_a)
      .map((p) => asRecord(p))
      .map((p) => ({ indice: asNumber(p.indice) ?? -1, pregunta: asString(p.pregunta) ?? '', opciones: asStringArray(p.opciones) }))
      .filter((p) => p.indice >= 0 && p.pregunta !== ''),
    seccionB: asArray(r.seccion_b)
      .map((p) => asRecord(p))
      .map((p) => ({ indice: asNumber(p.indice) ?? -1, afirmacion: asString(p.afirmacion) ?? '' }))
      .filter((p) => p.indice >= 0 && p.afirmacion !== ''),
    seccionC: {
      conceptos: asArray(c.conceptos)
        .map((p) => asRecord(p))
        .map((p) => ({ indice: asNumber(p.indice) ?? -1, concepto: asString(p.concepto) ?? '' }))
        .filter((p) => p.indice >= 0 && p.concepto !== ''),
      descripciones: Object.entries(descripciones)
        .map(([letra, texto]) => ({ letra, texto: typeof texto === 'string' ? texto : '' }))
        .filter((d) => d.texto !== ''),
    },
    seccionD: asArray(r.seccion_d)
      .map((p) => asRecord(p))
      .map((p) => ({ clave: asString(p.clave) ?? '', puntosMax: asNumber(p.puntos_max) ?? 0, enunciado: asString(p.enunciado) ?? '' }))
      .filter((p) => p.clave !== '' && p.enunciado !== ''),
    seccionE: {
      aspectos: asArray(e.aspectos)
        .map((p) => asRecord(p))
        .map((p) => ({ clave: asString(p.clave) ?? '', texto: asString(p.texto) ?? '' }))
        .filter((p) => p.clave !== ''),
      escalaMin: asNumber(e.escala_min) ?? 1,
      escalaMax: asNumber(e.escala_max) ?? 5,
    },
  };
}
