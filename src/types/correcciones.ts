/**
 * Correcciones propias (datos personales/médicos, documentos rechazados,
 * foto de perfil) — espejo de `GET /api/v1/correcciones`
 * (`App\Services\Expedientes\CorreccionesService`, ver
 * `capacitaciones/docs/SOLICITUDES_UNIFICADAS.md` → «API de correcciones»).
 */

export type OrigenCorreccion = 'solicitud' | 'documento' | 'foto' | (string & {});

export type EstadoCorreccion = 'enviada' | 'en_revision' | 'aprobada' | 'rechazada' | 'requiere_informacion' | 'cancelada' | (string & {});

export interface CorreccionHistorialEntrada {
  accion: string;
  etiqueta: string;
  por: string | null;
  es_rh: boolean;
  comentario: string | null;
  origen_etiqueta: string | null;
  en: string | null;
}

export interface Correccion {
  /** Clave única: `solicitud-12` | `documento-5` | `foto-3`. */
  id: string;
  origen: OrigenCorreccion;
  recurso_id: number | null;
  folio: string | null;
  tipo: string;
  titulo: string;
  estado: EstadoCorreccion;
  estado_etiqueta: string;
  estado_descripcion: string | null;
  comentario_rh: string | null;
  requiere_accion: boolean;
  puede_responder: boolean;
  /** Etiquetas de los campos (nunca valores). */
  campos: string[];
  resuelta_por: string | null;
  resuelta_en: string | null;
  creada_en: string | null;
  actualizada_en: string | null;
  historial: CorreccionHistorialEntrada[];
}

export interface ConteoCorrecciones {
  requieren_accion: number;
  en_proceso: number;
  abiertas: number;
}

export interface CorreccionesRespuesta {
  data: Correccion[];
  conteo: ConteoCorrecciones;
}

/** Fila de `datos_propuestos` (`ActualizacionDatosService::comparativo()`) en el detalle de la solicitud. */
export interface DatoPropuesto {
  campo: string;
  etiqueta: string;
  actual: string | null;
  propuesto: string;
}

/** `POST /api/v1/solicitudes/{id}/responder`. */
export interface ResponderCorreccionPayload {
  mensaje: string;
  datos?: Record<string, string>;
}
