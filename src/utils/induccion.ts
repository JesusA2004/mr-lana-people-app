import type {
  ContenidoEvaluacionInduccion,
  EvaluacionInduccion,
  InduccionResumen,
  IntentoInduccion,
  RespuestasInduccion,
} from '@/types/induccion';

/**
 * Lógica de PRESENTACIÓN de la inducción. El estado real (qué páginas
 * del PDF oficial están vistas, si la evaluación está habilitada, la calificación, el
 * reintento) lo decide el backend; aquí solo se traduce a texto y se
 * elige qué mostrar. Nunca se califica en el teléfono.
 */

export type FaseInduccion =
  | 'sin_induccion'
  | 'contenido'
  | 'evaluacion_disponible'
  | 'pendiente_rh'
  | 'reforzamiento'
  | 'reevaluacion_disponible'
  | 'aprobada';

export function faseInduccion(resumen: InduccionResumen | null, evaluacion: EvaluacionInduccion | null): FaseInduccion {
  if (!resumen && !evaluacion) return 'sin_induccion';
  if (evaluacion) {
    switch (evaluacion.estado) {
      case 'aprobada':
        return 'aprobada';
      case 'pendiente_calificacion_rh':
        return 'pendiente_rh';
      case 'requiere_reforzamiento':
        return 'reforzamiento';
      case 'reevaluacion_habilitada':
        return evaluacion.puedePresentar ? 'reevaluacion_disponible' : 'reforzamiento';
      case 'disponible':
        return evaluacion.puedePresentar ? 'evaluacion_disponible' : 'contenido';
    }
  }
  return 'contenido';
}

/** "12 de 30 páginas" — los números vienen del servidor. */
export function textoProgreso(resumen: InduccionResumen): string {
  const total = resumen.totalPaginas;
  return `${Math.min(resumen.paginasVistas.length, total)} de ${total} ${total === 1 ? 'página' : 'páginas'}`;
}

/** Páginas que aún no se han mostrado (para «Te faltan N»). */
export function paginasFaltantes(resumen: InduccionResumen | null, total: number): number {
  if (!resumen || total <= 0) return total;
  return Math.max(0, total - new Set(resumen.paginasVistas.filter((p) => p >= 1 && p <= total)).size);
}

/** Último intento ya calificado por completo (A+B+C+D). */
export function ultimoIntentoCalificado(evaluacion: EvaluacionInduccion | null): IntentoInduccion | null {
  if (!evaluacion) return null;
  const calificados = evaluacion.intentos.filter((i) => !i.pendienteCalificacionRh && i.calificacionTotal !== null);
  return calificados.length > 0 ? calificados[calificados.length - 1] : null;
}

export interface ResultadoInduccion {
  puntos: string;
  porcentaje: string;
  etiqueta: string;
  tono: 'success' | 'warning';
  mensaje: string | null;
}

/**
 * "28 / 30 · 93 % · Comprensión sobresaliente". El nivel lo manda el backend
 * (`nivel`); la etiqueta es solo su texto para la persona.
 */
export function resultadoInduccion(intento: IntentoInduccion, totalPuntos = 30): ResultadoInduccion {
  const calificacion = intento.calificacionTotal ?? 0;
  const puntos = `${formatoPuntos(calificacion)} / ${totalPuntos}`;
  const porcentaje = `${Math.round((calificacion / totalPuntos) * 100)} %`;

  switch (intento.nivel) {
    case 'sobresaliente':
      return { puntos, porcentaje, etiqueta: 'Comprensión sobresaliente', tono: 'success', mensaje: null };
    case 'aprobado':
      return { puntos, porcentaje, etiqueta: 'Aprobado', tono: 'success', mensaje: null };
    default:
      return {
        puntos,
        porcentaje,
        etiqueta: intento.aprobado ? 'Aprobado' : 'Requiere reforzamiento',
        tono: intento.aprobado ? 'success' : 'warning',
        mensaje: intento.aprobado ? null : 'Recursos Humanos te apoyará a reforzar algunos temas.',
      };
  }
}

function formatoPuntos(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1);
}

/** Fecha "YYYY-MM-DD" → "15 de octubre de 2026" (sin desfase de zona horaria). */
export function fechaLegible(fecha: string | null): string | null {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return null;
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${dia} de ${meses[mes - 1]} de ${anio}`;
}

/** Todas las secciones calificables (A, B, C y D) contestadas. E (opinión) es opcional. */
export function evaluacionCompleta(contenido: ContenidoEvaluacionInduccion, r: RespuestasInduccion): boolean {
  const a = contenido.seccionA.every((p) => typeof r.a[p.indice] === 'number');
  const b = contenido.seccionB.every((p) => typeof r.b[p.indice] === 'boolean');
  const c = contenido.seccionC.conceptos.every((p) => typeof r.c[p.indice] === 'string' && r.c[p.indice] !== '');
  const d = contenido.seccionD.every((p) => (r.d[p.clave] ?? '').trim() !== '');
  return a && b && c && d;
}

/** Cuántas preguntas calificables faltan (para el aviso antes de enviar). */
export function preguntasFaltantes(contenido: ContenidoEvaluacionInduccion, r: RespuestasInduccion): number {
  return (
    contenido.seccionA.filter((p) => typeof r.a[p.indice] !== 'number').length +
    contenido.seccionB.filter((p) => typeof r.b[p.indice] !== 'boolean').length +
    contenido.seccionC.conceptos.filter((p) => !r.c[p.indice]).length +
    contenido.seccionD.filter((p) => (r.d[p.clave] ?? '').trim() === '').length
  );
}
