/**
 * Confirmado contra backend real (App\Enums\TipoSolicitudInterna,
 * App\Enums\EstadoSolicitudInterna, App\Http\Resources\Api\V1\SolicitudInternaResource,
 * App\Http\Requests\Solicitudes\StoreSolicitudInternaRequest). El payload de
 * creación usa `motivo` (requerido), no `comentario` — enviar `comentario`
 * como antes hacía que el backend respondiera 422 en producción.
 */
export type RequestType =
  | 'permiso_con_goce'
  | 'permiso_sin_goce'
  | 'incapacidad'
  | 'constancia_laboral'
  | 'actualizacion_datos'
  | 'actualizacion_bancaria'
  | 'reposicion_documental'
  | 'prestamo_interno'
  | 'general'
  | (string & {});

export type RequestStatus =
  | 'creada'
  | 'enviada'
  | 'en_revision'
  | 'aprobada'
  | 'rechazada'
  | 'requiere_correccion'
  | 'cancelada'
  | 'cerrada'
  | (string & {});

/** Tipos cuyo formulario incluye rango de fechas (ver TipoSolicitudInterna::usaRangoFechas). */
export const REQUEST_TYPES_WITH_DATE_RANGE: RequestType[] = ['permiso_con_goce', 'permiso_sin_goce', 'incapacidad'];

/** Adjunto de la propia solicitud (App\Models\SolicitudInternaDocumento). */
export interface SolicitudDocumentoAdjunto {
  id: number | string;
  original_name: string;
  mime?: string | null;
  size?: number | null;
  created_at?: string;
  subido_por?: string | null;
}

/** Documento generado por RH a partir de una plantilla (App\Models\GeneratedDocument), ligado a esta solicitud. */
export interface SolicitudDocumentoGenerado {
  id: number | string;
  generated_name: string;
  mime?: string | null;
  size?: number | null;
  status?: string;
  created_at?: string;
}

/** Entrada de bitácora (App\Models\SolicitudInternaHistorial vía SolicitudesService::registrarHistorial). */
export interface SolicitudHistorialItem {
  id: number | string;
  accion: string;
  comentario?: string | null;
  actor?: string | null;
  created_at?: string;
}

export interface Solicitud {
  id: number | string;
  folio?: string;
  tipo?: RequestType;
  tipo_etiqueta?: string;
  estado?: RequestStatus;
  estado_etiqueta?: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  motivo?: string;
  observaciones?: string | null;
  motivo_rechazo?: string | null;
  revisado_en?: string | null;
  creada_en?: string;
  /** Presentes solo en el detalle (`GET /solicitudes/{id}`) si el backend los enriquece — ver docs/MOBILE_BACKEND_REQUIREMENTS.md. */
  documentos?: SolicitudDocumentoAdjunto[];
  documentos_generados?: SolicitudDocumentoGenerado[];
  historial?: SolicitudHistorialItem[];
  [key: string]: unknown;
}

export interface CreateSolicitudPayload {
  tipo: RequestType;
  motivo: string;
  observaciones?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  [key: string]: unknown;
}
