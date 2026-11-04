import type {
  ContenidoEvaluacionInduccion,
  EvaluacionInduccion,
  InduccionResumen,
  HeartbeatVideoInduccion,
  IntentoInduccion,
  MaterialInduccion,
  MiInduccionAsignada,
  PdfInduccion,
  SesionVideoInduccion,
} from '@/types/induccion';
import { AppError } from '@/utils/errors';
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
    presentadaPorRhEn: asString(r.presentada_por_rh_en) ?? null,
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
    puedeDescargar: r.puede_descargar === true,
  };
}

function tipoMaterial(valor: unknown): 'audio' | 'video' | null {
  return valor === 'audio' || valor === 'video' ? valor : null;
}

/**
 * `data` de `colaborador/induccion/material/{avance}`:
 * {tipo, audio_url, video_disponible, video_estado?, video_mensaje?}. Tipo
 * desconocido = sin material. `video_estado`/`video_mensaje` son aditivos:
 * un servidor que no los mande sigue funcionando.
 */
export function normalizeMaterialInduccion(raw: unknown): MaterialInduccion {
  const r = asRecord(raw);
  const tipo = tipoMaterial(r.tipo);
  const videoDisponible = tipo === 'video' && asBoolean(r.video_disponible);
  return {
    tipo,
    videoDisponible,
    videoEstado: tipo === 'video' ? (asString(r.video_estado) ?? (videoDisponible ? 'listo' : 'preparando')) : null,
    videoMensaje: tipo === 'video' && !videoDisponible ? (asString(r.video_mensaje) ?? null) : null,
    videoBloqueado: tipo === 'video' && asBoolean(r.video_bloqueado),
    paginasFaltantes: asArray(r.paginas_faltantes)
      .map((p) => asNumber(p))
      .filter((p): p is number => p !== null && p >= 1),
    videoBloqueadoMensaje: asString(r.video_bloqueado_mensaje),
  };
}

/** Respuesta de «iniciar» (la API v1 la envuelve en `data`; el portal no). */
export function normalizeSesionVideoInduccion(raw: unknown): SesionVideoInduccion {
  const r = asRecord(raw);
  const url = asString(r.url_manifiesto) ?? '';
  if (!/^https?:\/\//i.test(url)) throw new AppError('El video de la inducción no está disponible por ahora. Intenta más tarde.');
  return {
    urlManifiesto: url,
    posicionInicial: Math.max(0, asNumber(r.posicion_inicial) ?? 0),
    duracionSegundos: asNumber(r.duracion_total_segundos),
    porcentajeVisto: Math.max(0, Math.min(100, asNumber(r.porcentaje_visto) ?? 0)),
    segundoMaximoPermitido: Math.max(0, asNumber(r.segundo_maximo_permitido) ?? 0),
    // Nunca 0 (un setInterval de 0 ms saturaría al servidor).
    heartbeatSegundos: Math.max(3, asNumber(r.heartbeat_segundos) ?? 8),
    completada: asBoolean(r.completada),
  };
}

export function normalizeHeartbeatVideoInduccion(raw: unknown): HeartbeatVideoInduccion {
  const r = asRecord(raw);
  return {
    permitido: r.permitido !== false,
    posicionPermitida: Math.max(0, asNumber(r.posicion_permitida) ?? 0),
    segundoMaximoPermitido: Math.max(0, asNumber(r.segundo_maximo_permitido) ?? 0),
    porcentajeVisto: Math.max(0, Math.min(100, asNumber(r.porcentaje_visto) ?? 0)),
    completada: asBoolean(r.completada),
  };
}

/** `miInduccion` de mi-proceso (ProgresoInduccionService::resumen); null si el servidor no lo manda. */
export function normalizeMiInduccionAsignada(raw: unknown): MiInduccionAsignada | null {
  const r = asRecordOrNull(raw);
  if (!r) return null;
  const presentacion = asRecordOrNull(r.presentacion);
  const material = asRecordOrNull(r.material);
  return {
    // Sin el dato, se asume el comportamiento de siempre: el PDF cuenta.
    presentacionIncluida: presentacion ? presentacion.incluida !== false : true,
    presentacionCompleta: presentacion ? asBoolean(presentacion.completada) : false,
    material: material
      ? {
          incluido: asBoolean(material.incluido),
          tipo: tipoMaterial(material.tipo),
          completado: asBoolean(material.completado),
          disponible: asBoolean(material.disponible),
          porcentaje: Math.max(0, Math.min(100, asNumber(material.porcentaje) ?? 0)),
          iniciado: asBoolean(material.iniciado),
        }
      : null,
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
