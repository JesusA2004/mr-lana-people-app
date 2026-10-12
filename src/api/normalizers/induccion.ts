import type {
  BloqueCapitulo,
  CapituloInduccion,
  CapitulosInduccion,
  ContenidoEvaluacionInduccion,
  EvaluacionInduccion,
  InduccionResumen,
  IntentoInduccion,
  MiniOrganigramaNodo,
} from '@/types/induccion';
import { asArray, asBoolean, asId, asNullableBoolean, asNumber, asRecord, asRecordOrNull, asString, asStringArray } from '@/utils/normalize';

export function normalizeInduccionResumen(raw: unknown): InduccionResumen | null {
  const r = asRecordOrNull(raw);
  const avanceId = asId(r?.avance_id);
  if (!r || avanceId === null) return null;

  return {
    avanceId,
    titulo: asString(r.titulo) ?? 'Inducción Mr. Lana',
    totalCapitulos: asNumber(r.total_capitulos) ?? 0,
    capitulosVistos: asNumber(r.capitulos_vistos) ?? 0,
    clavesVistas: asStringArray(r.claves_vistas),
    porcentaje: Math.max(0, Math.min(100, asNumber(r.porcentaje) ?? 0)),
    ultimoCapitulo: asString(r.ultima_capitulo),
    completado: asBoolean(r.completado),
  };
}

/** Un bloque desconocido (backend más nuevo) se descarta: nunca se pinta JSON crudo. */
function normalizeBloque(raw: unknown): BloqueCapitulo | null {
  const r = asRecord(raw);
  switch (r.tipo) {
    case 'parrafo': {
      const texto = asString(r.texto);
      return texto ? { tipo: 'parrafo', titulo: asString(r.titulo), texto } : null;
    }
    case 'destacado': {
      const texto = asString(r.texto);
      return texto ? { tipo: 'destacado', texto } : null;
    }
    case 'datos':
      return {
        tipo: 'datos',
        items: asArray(r.items)
          .map((i) => asRecord(i))
          .map((i) => ({ etiqueta: asString(i.etiqueta) ?? '', valor: asString(i.valor) ?? '' }))
          .filter((i) => i.etiqueta || i.valor),
      };
    case 'lista':
      return { tipo: 'lista', titulo: asString(r.titulo), texto: asString(r.texto), destacado: asBoolean(r.destacado), items: asStringArray(r.items) };
    case 'tarjetas':
      return {
        tipo: 'tarjetas',
        titulo: asString(r.titulo),
        items: asArray(r.items)
          .map((i) => asRecord(i))
          .map((i) => ({ titulo: asString(i.titulo) ?? '', texto: asString(i.texto) ?? '', nota: asString(i.nota) }))
          .filter((i) => i.titulo || i.texto),
      };
    case 'organigrama_dinamico': {
      const vista = asString(r.vista);
      return vista ? { tipo: 'organigrama_dinamico', vista, titulo: asString(r.titulo) ?? 'Organigrama', nota: asString(r.nota) } : null;
    }
    case 'cierre':
      return { tipo: 'cierre', titulo: asString(r.titulo) ?? '', texto: asString(r.texto) ?? '' };
    default:
      return null;
  }
}

export function normalizeCapitulo(raw: unknown): CapituloInduccion | null {
  const r = asRecord(raw);
  const clave = asString(r.clave);
  if (!clave) return null;

  return {
    clave,
    numero: asNumber(r.numero) ?? 0,
    titulo: asString(r.titulo) ?? clave,
    subtitulo: asString(r.subtitulo),
    bloques: asArray(r.bloques)
      .map(normalizeBloque)
      .filter((b): b is BloqueCapitulo => b !== null),
  };
}

export function normalizeCapitulos(raw: unknown): CapituloInduccion[] {
  return asArray(raw)
    .map(normalizeCapitulo)
    .filter((c): c is CapituloInduccion => c !== null);
}

export function normalizeCapitulosInduccion(raw: unknown): CapitulosInduccion {
  const r = asRecord(raw);
  return {
    avanceId: asId(r.avance_id) ?? 0,
    capitulos: normalizeCapitulos(r.capitulos),
    resumen: normalizeInduccionResumen(r.resumen),
  };
}

export function normalizeMiniOrganigrama(raw: unknown): MiniOrganigramaNodo | null {
  const r = asRecordOrNull(raw);
  const id = asId(r?.id);
  if (!r || id === null) return null;

  return {
    id,
    nombre: asString(r.nombre) ?? 'Puesto',
    // Solo nombre/sucursal de cada ocupante: la app nunca necesita más.
    ocupantes: asArray(r.ocupantes)
      .map((o) => asRecord(o))
      .map((o) => ({ id: asId(o.id) ?? 0, nombre: asString(o.nombre) ?? '', sucursal: asString(o.sucursal) }))
      .filter((o) => o.nombre !== ''),
    hijos: asArray(r.hijos)
      .map(normalizeMiniOrganigrama)
      .filter((h): h is MiniOrganigramaNodo => h !== null),
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
