/**
 * Solicitud de empleo + Estudio socioeconómico dentro del registro —
 * contrato de `GET /api/v1/colaborador/registro/solicitud` y
 * `POST /api/v1/colaborador/registro/solicitud/{seccion}` (capacitaciones:
 * docs/SOLICITUD_EMPLEO_Y_SOCIOECONOMICO.md,
 * App\Services\Incorporacion\SolicitudEmpleo\PerfilIngresoService::estado()).
 * El catálogo (qué se pide, qué es obligatorio y bajo qué condición) lo
 * manda el backend: la app solo lo dibuja.
 */

/** Secciones en el orden del formato. */
export const SECCIONES_SOLICITUD = ['personal', 'domicilio', 'dependientes', 'vivienda', 'economica', 'escolaridad', 'experiencia', 'referencias', 'perfil'] as const;

export type ClaveSeccionSolicitud = (typeof SECCIONES_SOLICITUD)[number];

export type TipoCampoSolicitud = 'texto' | 'texto_largo' | 'entero' | 'moneda' | 'booleano' | 'select' | 'multiselect' | 'fecha' | 'mes';

/** Valor tal como lo manda/recibe el backend. */
export type ValorSolicitud = string | number | boolean | string[] | null;

export interface OpcionSolicitud {
  value: string;
  label: string;
}

/** Condición para mostrar/exigir un campo (cónyuge solo casado, «cuál» solo con «Otro»…). */
export interface CondicionSolicitud {
  campo: string;
  operador: 'igual' | 'en' | 'distinto' | 'positivo' | 'contiene';
  valor: ValorSolicitud;
}

export interface CampoSolicitud {
  campo: string;
  etiqueta: string;
  tipo: TipoCampoSolicitud;
  opciones: OpcionSolicitud[];
  valor: ValorSolicitud;
  /** Texto legible de un dato personal ya registrado (etiqueta, fecha dd/mm/aaaa); null si no aplica. */
  valor_legible: string | null;
  /** Prellenado (fuente del candidato, visita, INE…): solo se guarda cuando la persona guarda la sección. */
  sugerencia: ValorSolicitud;
  /** Obligatorio con los valores GUARDADOS (la app lo recalcula con `requerido_si` mientras se captura). */
  requerido: boolean;
  requerido_si: CondicionSolicitud | null;
  permite_no_aplica: boolean;
  no_aplica: boolean;
  /** No editable aquí (dato de «Datos personales» o ya capturado por RH). */
  bloqueado: boolean;
  /** `datos_personales` = se captura en el paso «Datos personales» del registro. */
  origen: 'datos_personales' | 'solicitud';
  documentos: string[];
  min: number | null;
  max: number | null;
  ayuda: string | null;
}

export interface CampoListaSolicitud {
  campo: string;
  etiqueta: string;
  tipo: TipoCampoSolicitud;
  requerido: boolean;
  opciones: OpcionSolicitud[];
  min: number | null;
  max: number | null;
}

export type FilaListaSolicitud = Record<string, string | number | null>;

export interface ListaSolicitud {
  clave: string;
  etiqueta: string;
  singular: string;
  minimo: number;
  maximo: number;
  /** Bandera explícita «No tengo dependientes» / «Es mi primer empleo» (null = la lista no la admite). */
  bandera_vacia: string | null;
  etiqueta_vacia: string | null;
  vacia: boolean;
  bloqueada: boolean;
  campos: CampoListaSolicitud[];
  filas: FilaListaSolicitud[];
}

export interface SeccionSolicitud {
  clave: string;
  titulo: string;
  descripcion: string;
  completa: boolean;
  porcentaje: number;
  /** Etiquetas legibles de lo que falta en la sección. */
  faltantes: string[];
  guardada_en: string | null;
  origen: string | null;
  campos: CampoSolicitud[];
  lista: ListaSolicitud | null;
}

export interface FaltanteSolicitud {
  seccion: string;
  campo: string;
  etiqueta: string;
  documentos: string[];
  origen: 'datos_personales' | 'solicitud';
}

export interface ResumenSeccionSolicitud {
  clave: string;
  titulo: string;
  completa: boolean;
  porcentaje: number;
  faltantes: string[];
}

export interface DocumentoSolicitud {
  clave: string;
  nombre: string;
  completo: boolean;
  /** «Faltan 3 datos para generar la Solicitud de Empleo: …». */
  mensaje: string;
}

export interface EstadoSolicitudEmpleo {
  registro_abierto: boolean;
  /** El registro no cierra sin la solicitud completa (la app manda `X-People-Solicitud-Empleo: 1`). */
  exigida: boolean;
  secciones: SeccionSolicitud[];
  completitud: {
    completo: boolean;
    porcentaje: number;
    total: number;
    completos: number;
    faltantes: FaltanteSolicitud[];
    secciones: ResumenSeccionSolicitud[];
    documentos: DocumentoSolicitud[];
  };
}

/** Bloque `solicitud_empleo` de `GET /colaborador/registro`. */
export interface ResumenSolicitudRegistro {
  exigida: boolean;
  completo: boolean;
  porcentaje: number;
  secciones: ResumenSeccionSolicitud[];
  documentos: DocumentoSolicitud[];
  /** «Datos personales: Tipo sanguíneo, …» (uno por sección incompleta). */
  pendientes: string[];
}

/** Cuerpo de `POST registro/solicitud/{seccion}`. */
export interface GuardarSeccionSolicitud {
  datos: Record<string, unknown>;
  /** Lista COMPLETA de los campos de la sección declarados «No aplica» (omitida = sin cambios). */
  no_aplica?: string[];
}
