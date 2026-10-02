/**
 * Reclutamiento para la app (gerente / RH) — espejo de
 * `App\Services\Reclutamiento\CandidatoPresenter` y
 * `App\Services\Reclutamiento\CandidatoWorkflowService::accionesPermitidas()`.
 * Mismo `CicloLaboralService::obtenerEstado()` que el resto del ciclo
 * laboral: `ciclo` nunca se recalcula en la app.
 */

/** `App\Enums\EstadoCandidato` — valores reales del pipeline consolidado. */
export const ESTADOS_CANDIDATO = [
  'recibidos',
  'entrevista_pendiente',
  'psicometricas_pendientes',
  'revision_psicometricas',
  'socioeconomico_pendiente',
  'referencias_pendientes',
  'preseleccion_gerente',
  'autorizacion_rh_pendiente',
  'autorizado_rh',
  'en_contratacion',
  'contratado',
  'no_viable',
  'no_seleccionado',
  'rechazado_rh',
  'no_respondio',
  'desistio',
] as const;
export type EstadoCandidato = (typeof ESTADOS_CANDIDATO)[number];

export const ESTADOS_SALIDA_CANDIDATO = ['no_viable', 'no_seleccionado', 'rechazado_rh', 'no_respondio', 'desistio'] as const;

/** `DescartarCandidatoRequest` — motivos de salida que puede capturar quien descarta. */
export const MOTIVOS_DESCARTE: { value: string; label: string }[] = [
  { value: 'no_viable', label: 'No viable' },
  { value: 'no_seleccionado', label: 'No seleccionado' },
  { value: 'no_respondio', label: 'No respondió' },
  { value: 'desistio', label: 'Desistió' },
];

export interface CandidatoAccion {
  clave: string;
  etiqueta: string;
  tipo: 'primaria' | 'secundaria' | 'peligro' | string;
}

export interface CicloPaso {
  clave: string;
  etiqueta: string;
  estado: 'completado' | 'actual' | 'detenido' | 'pendiente' | string;
}

export interface CicloAprobacionResumen {
  nivel: string;
  etiqueta: string;
  estado: string;
  aprobadores: string[];
  decidio: string | null;
  comentario: string | null;
  fecha: string | null;
}

export interface CicloTimelineEvento {
  fecha: string | null;
  titulo: string;
  descripcion: string | null;
  actor: string | null;
}

/** `CicloLaboralService::obtenerEstado()` — DTO único de estado, reutilizado tal cual. */
export interface EstadoCiclo {
  persona: { tipo: string; id: number; nombre: string; puesto: string | null; sucursal: string | null } | null;
  etapa: { clave: string; etiqueta: string } | null;
  estado: { clave: string; etiqueta: string } | null;
  progreso: number;
  responsable_actual: { rol: string; nombre: string | null } | null;
  siguiente_accion: { clave: string; etiqueta: string } | null;
  fecha_desde_estado: string | null;
  bloqueos: string[];
  pasos: CicloPaso[];
  aprobaciones: CicloAprobacionResumen[];
  timeline: CicloTimelineEvento[];
  acciones_permitidas: CandidatoAccion[];
}

/** Renglón de lista — `CandidatoPresenter::fila()`. */
export interface CandidatoFila {
  id: number;
  nombre_completo: string;
  puesto_objetivo: string | null;
  sucursal: string | null;
  estado: EstadoCandidato | string;
  estado_etiqueta: string | null;
  etapa_maxima: number;
  creado_en: string | null;
}

export interface CandidatoEntrevista {
  id: number;
  realizada_en: string;
  entrevistador: string | null;
  resultado: string;
  resultado_etiqueta: string | null;
  observaciones: string | null;
}

export interface CandidatoEvidencia {
  id: number;
  tipo: string;
  tipo_etiqueta: string | null;
  nombre: string | null;
  mime: string | null;
  tamano: number | null;
  subida_en: string | null;
}

export interface CandidatoPsicometrica {
  id: number;
  link: string | null;
  enviada_en: string | null;
  resultados_en: string | null;
  resumen_resultados: string | null;
  revision_resultado: string | null;
  revision_observaciones: string | null;
  revisada_en: string | null;
  evidencias: CandidatoEvidencia[];
}

export interface CandidatoSocioeconomico {
  id: number;
  fecha_visita: string;
  visitador: string | null;
  direccion: string;
  checklist: Record<string, unknown>;
  riesgos: string | null;
  observaciones: string | null;
  resultado: string;
  resultado_etiqueta: string | null;
  evidencias: CandidatoEvidencia[];
}

export interface CandidatoReferencia {
  id: number;
  empresa: string;
  contacto: string;
  telefono: string | null;
  relacion_puesto: string | null;
  resultado: string;
  resultado_etiqueta: string | null;
  observaciones: string | null;
  fecha_validacion: string;
  validada_por: string | null;
}

export interface CandidatoInvitacion {
  id: number;
  estado: string;
  estado_etiqueta: string | null;
  expira_en: string;
  usada_en: string | null;
}

/** Ficha completa — `CandidatoPresenter::detalle()`. */
export interface CandidatoDetalle {
  id: number;
  nombre: string;
  apellidos: string | null;
  nombre_completo: string;
  telefono: string | null;
  correo: string | null;
  fuente: string | null;
  campana: string | null;
  empresa: string | null;
  sucursal: string | null;
  sucursal_id: number | null;
  departamento: string | null;
  puesto: string | null;
  puesto_objetivo_id: number | null;
  vacante_id: number | null;
  empresa_id: number | null;
  departamento_id: number | null;
  responsable_rh_id: number | null;
  gerente_involucrado_id: number | null;
  responsable_rh: string | null;
  gerente: string | null;
  observaciones: string | null;
  estado: EstadoCandidato | string;
  estado_etiqueta: string | null;
  motivo_salida: string | null;
  tiene_cv: boolean;
  colaborador_id: number | null;
  creado_en: string | null;
  contratado_en: string | null;
  entrevistas: CandidatoEntrevista[];
  psicometricas: CandidatoPsicometrica[];
  socioeconomicos: CandidatoSocioeconomico[];
  referencias: CandidatoReferencia[];
  invitacion: CandidatoInvitacion | null;
}

/** `GET /rh/candidatos/{id}` y toda acción de workflow responden `{candidato, ciclo}`. */
export interface CandidatoFicha {
  candidato: CandidatoDetalle;
  ciclo: EstadoCiclo;
}

// ------------------------------------------------------------ Payloads de acciones

/** `EvaluarFiltroCandidatoRequest` — perfil, revisión de psicométricas, conclusión de referencias. */
export interface EvaluarFiltroPayload {
  viable: boolean;
  observaciones?: string | null;
}

/** `RegistrarEntrevistaRequest`. */
export interface RegistrarEntrevistaPayload {
  realizada_en: string;
  resultado: 'viable' | 'no_viable';
  observaciones?: string | null;
  entrevistador_user_id?: number | null;
}

/** `RegistrarSocioeconomicoRequest`. */
export interface RegistrarSocioeconomicoPayload {
  fecha_visita: string;
  direccion: string;
  checklist?: {
    vivienda_en_orden?: boolean;
    vive_con_familia?: boolean;
    arraigo_anios?: number;
    resguardo_motocicleta?: boolean;
  };
  riesgos?: string | null;
  observaciones?: string | null;
  resultado: 'viable' | 'no_viable';
  visitador_user_id?: number | null;
}

/** `RegistrarReferenciaRequest`. */
export interface RegistrarReferenciaPayload {
  empresa: string;
  contacto: string;
  telefono?: string | null;
  relacion_puesto?: string | null;
  resultado: 'positiva' | 'negativa' | 'no_localizada';
  observaciones?: string | null;
  fecha_validacion?: string | null;
}

/** `DescartarCandidatoRequest`. */
export interface DescartarPayload {
  estado: 'no_viable' | 'no_seleccionado' | 'no_respondio' | 'desistio';
  motivo: string;
}
