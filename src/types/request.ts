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

export interface Solicitud {
  id: number | string;
  folio?: string;
  tipo?: RequestType;
  tipo_etiqueta?: string;
  estado?: RequestStatus;
  estado_etiqueta?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  motivo?: string;
  observaciones?: string;
  motivo_rechazo?: string;
  revisado_en?: string;
  creada_en?: string;
  [key: string]: unknown;
}

export interface CreateSolicitudPayload {
  tipo: RequestType;
  motivo: string;
  observaciones?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}
