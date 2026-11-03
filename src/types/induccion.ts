/**
 * Inducción Mr. Lana (el PDF oficial, página por página) y su evaluación oficial (FO-RH-EI, 30
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
  /** Avance por páginas MOSTRADAS del PDF oficial (servidor). */
  totalPaginas: number;
  paginasVistas: number[];
  ultimaPagina: number | null;
  porcentaje: number;
  completado: boolean;
  /** Fecha ISO en que Recursos Humanos te la presentó en una sesión (o null). */
  presentadaPorRhEn: string | null;
}

/** El PDF oficial de la inducción (`data.pdf` del backend). */
export interface PdfInduccion {
  /** Ruta relativa a la API (Bearer). */
  path: string;
  titulo: string;
  totalPaginas: number;
  puedeDescargar: boolean;
}

/**
 * Material de explicación activo de la inducción
 * (`GET colaborador/induccion/material/{avance}` →
 * `MaterialInduccionService::datosParaColaborador`). El video es
 * obligatorio antes de terminar; mientras el servidor lo procesa
 * `videoDisponible` es false.
 */
export interface MaterialInduccion {
  tipo: 'audio' | 'video' | null;
  videoDisponible: boolean;
  /** 'listo' | 'preparando' (aditivo del backend; null si no aplica). */
  videoEstado: string | null;
  /** Por qué el video aún no se puede ver (texto del backend, ya en español). */
  videoMensaje: string | null;
}

/** `POST colaborador/induccion/video/{avance}/iniciar` (ReproduccionVideoInduccionService::iniciarSesion). */
export interface SesionVideoInduccion {
  urlManifiesto: string;
  /** Lo máximo ya visto: se retoma ahí. */
  posicionInicial: number;
  duracionSegundos: number | null;
  porcentajeVisto: number;
  /** Límite de avance que acepta el servidor (lo visto + tolerancia). */
  segundoMaximoPermitido: number;
  heartbeatSegundos: number;
  completada: boolean;
}

/** `POST colaborador/induccion/video/{avance}/heartbeat`. */
export interface HeartbeatVideoInduccion {
  /** false = intentó adelantar: hay que regresar a `posicionPermitida`. */
  permitido: boolean;
  posicionPermitida: number;
  segundoMaximoPermitido: number;
  porcentajeVisto: number;
  completada: boolean;
}

/**
 * Lo que se le ASIGNÓ y su avance (`miInduccion` de mi-proceso,
 * ProgresoInduccionService). En una reinducción de solo video la
 * presentación (PDF) puede no estar incluida.
 */
export interface MiInduccionAsignada {
  presentacionIncluida: boolean;
  presentacionCompleta: boolean;
  material: {
    incluido: boolean;
    tipo: 'audio' | 'video' | null;
    completado: boolean;
    disponible: boolean;
    porcentaje: number;
    iniciado: boolean;
  } | null;
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
