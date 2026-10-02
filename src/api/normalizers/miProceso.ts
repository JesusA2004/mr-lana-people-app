import type { Leccion, LeccionEstado, MiProceso, MiProcesoDestino, MiProcesoPendiente, ResultadoLeccion } from '@/types/miProceso';
import { asArray, asBoolean, asId, asNumber, asRecord, asRecordOrNull, asString, asStringArray } from '@/utils/normalize';

const DESTINOS: readonly MiProcesoDestino[] = ['expediente', 'documentos-laborales', 'lecciones'];
const ESTADOS_LECCION: readonly LeccionEstado[] = ['disponible', 'aprobada', 'bloqueada', 'en_espera'];

function normalizePendiente(raw: unknown): MiProcesoPendiente | null {
  const r = asRecord(raw);
  const titulo = asString(r.titulo);
  if (!titulo) return null;

  const accionRaw = asRecordOrNull(r.accion);
  const destino = asString(accionRaw?.app);

  return {
    clave: asString(r.clave) ?? titulo,
    titulo,
    descripcion: asString(r.descripcion) ?? '',
    tipo: r.tipo === 'accion' ? 'accion' : 'espera',
    accion: accionRaw
      ? {
          etiqueta: asString(accionRaw.etiqueta) ?? 'Continuar',
          // Un destino desconocido (backend más nuevo) no se navega: el botón se oculta.
          destino: destino && (DESTINOS as readonly string[]).includes(destino) ? (destino as MiProcesoDestino) : null,
        }
      : null,
    detalle: asStringArray(r.detalle),
  };
}

function normalizeLeccion(raw: unknown): Leccion | null {
  const r = asRecord(raw);
  const avanceId = asId(r.avance_id);
  if (avanceId === null) return null;
  const estado = asString(r.estado);

  return {
    avanceId,
    titulo: asString(r.titulo) ?? 'Lección',
    descripcion: asString(r.descripcion),
    estado: estado && (ESTADOS_LECCION as readonly string[]).includes(estado) ? (estado as LeccionEstado) : 'bloqueada',
    contenidoUrl: asString(r.contenido_url),
    contenido: asString(r.contenido),
    preguntas: asArray(r.preguntas)
      .map((p) => {
        const pr = asRecord(p);
        const indice = asNumber(pr.indice);
        const pregunta = asString(pr.pregunta);
        return indice === null || !pregunta ? null : { indice, pregunta, opciones: asStringArray(pr.opciones) };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null),
    puedePresentar: asBoolean(r.puede_presentar),
    retroalimentacion: asString(r.retroalimentacion),
    calificacion: asNumber(r.calificacion),
    calificacionMinima: asNumber(r.calificacion_minima),
  };
}

export function normalizeMiProceso(raw: unknown): MiProceso {
  const r = asRecord(raw);
  const docs = asRecordOrNull(r.documentos);

  return {
    pendientes: asArray(r.pendientes)
      .map(normalizePendiente)
      .filter((p): p is MiProcesoPendiente => p !== null),
    lecciones: asArray(r.lecciones)
      .map(normalizeLeccion)
      .filter((l): l is Leccion => l !== null),
    documentos: docs
      ? {
          requeridos: asNumber(docs.requeridos) ?? 0,
          aprobados: asNumber(docs.aprobados) ?? 0,
          faltantes: asNumber(docs.faltantes) ?? 0,
        }
      : null,
    todoListo: asBoolean(r.todo_listo),
  };
}

export function normalizeResultadoLeccion(raw: unknown): ResultadoLeccion {
  const r = asRecord(raw);
  const intento = asRecord(r.intento);
  const proceso = asRecordOrNull(r.proceso);

  return {
    numero: asNumber(intento.numero) ?? 1,
    calificacion: asNumber(intento.calificacion) ?? 0,
    aprobado: asBoolean(intento.aprobado),
    proceso: proceso ? normalizeMiProceso(proceso) : null,
  };
}
