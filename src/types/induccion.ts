/**
 * Inducción Mr. Lana (7 capítulos) y su evaluación oficial (FO-RH-EI, 30
 * puntos) — contrato real de `App\Http\Controllers\Api\V1\MiProcesoController`
 * y `App\Services\Onboarding\EvaluacionInduccionService` (capacitaciones).
 *
 * La clave de respuestas y la rúbrica NUNCA llegan a la app: estos tipos no
 * tienen campos para ellas a propósito.
 */

/** Resumen del contenido para "Mi proceso" (`induccionContenido`). */
export interface InduccionResumen {
  avanceId: number;
  titulo: string;
  totalCapitulos: number;
  capitulosVistos: number;
  /** Claves exactas vistas (se puede saltar entre capítulos); [] si el backend no las manda. */
  clavesVistas: string[];
  porcentaje: number;
  ultimoCapitulo: string | null;
  completado: boolean;
}

export type BloqueCapitulo =
  | { tipo: 'parrafo'; titulo: string | null; texto: string }
  | { tipo: 'destacado'; texto: string }
  | { tipo: 'datos'; items: { etiqueta: string; valor: string }[] }
  | { tipo: 'lista'; titulo: string | null; texto: string | null; destacado: boolean; items: string[] }
  | { tipo: 'tarjetas'; titulo: string | null; items: { titulo: string; texto: string; nota: string | null }[] }
  | { tipo: 'organigrama_dinamico'; vista: string; titulo: string; nota: string | null }
  | { tipo: 'cierre'; titulo: string; texto: string };

export interface CapituloInduccion {
  clave: string;
  numero: number;
  titulo: string;
  subtitulo: string | null;
  bloques: BloqueCapitulo[];
}

export interface CapitulosInduccion {
  avanceId: number;
  capitulos: CapituloInduccion[];
  resumen: InduccionResumen | null;
}

/** Nodo del mini-organigrama dinámico (puesto real + ocupantes + hijos). */
export interface MiniOrganigramaNodo {
  id: number;
  nombre: string;
  ocupantes: { id: number; nombre: string; sucursal: string | null }[];
  hijos: MiniOrganigramaNodo[];
}

export type EstadoEvaluacionInduccion =
  | 'disponible'
  | 'pendiente_calificacion_rh'
  | 'requiere_reforzamiento'
  | 'reevaluacion_habilitada'
  | 'aprobada'
  | (string & {});

export interface IntentoInduccion {
  id: number;
  numero: number;
  presentadoEn: string | null;
  pendienteCalificacionRh: boolean;
  calificacionTotal: number | null;
  nivel: string | null;
  nivelEtiqueta: string | null;
  aprobado: boolean | null;
}

export interface EvaluacionInduccion {
  id: number;
  estado: EstadoEvaluacionInduccion;
  estadoEtiqueta: string;
  intentosCount: number;
  mejorCalificacion: number | null;
  fechaLimiteReevaluacion: string | null;
  retroalimentacion: string | null;
  puedePresentar: boolean;
  intentos: IntentoInduccion[];
}

/** Contenido público de la evaluación (sin clave ni rúbrica). */
export interface ContenidoEvaluacionInduccion {
  version: string;
  totalPuntos: number;
  calificacionAprobatoria: number;
  seccionA: { indice: number; pregunta: string; opciones: string[] }[];
  seccionB: { indice: number; afirmacion: string }[];
  seccionC: { conceptos: { indice: number; concepto: string }[]; descripciones: { letra: string; texto: string }[] };
  seccionD: { clave: string; puntosMax: number; enunciado: string }[];
  seccionE: { aspectos: { clave: string; texto: string }[]; escalaMin: number; escalaMax: number };
}

export interface RespuestasInduccion {
  a: Record<number, number>;
  b: Record<number, boolean>;
  c: Record<number, string>;
  d: Record<string, string>;
}

export interface OpinionInduccion {
  claridad?: number;
  conocimiento_puesto?: number;
  bienvenida?: number;
  tema_reforzar?: string | null;
}
