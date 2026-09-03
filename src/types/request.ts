/**
 * `RequestType` y `RequestStatus` incluyen los valores documentados por el
 * backend, pero permanecen abiertos (`string & {}`) porque el catálogo real
 * debe respetarse tal cual lo devuelva la API — no se debe inventar lógica
 * administrativa en el cliente.
 */
export type RequestType =
  | 'vacaciones'
  | 'permiso_con_goce'
  | 'permiso_sin_goce'
  | 'incapacidad'
  | 'constancia_laboral'
  | 'actualizacion_datos'
  | 'actualizacion_bancaria'
  | 'reposicion_documental'
  | 'solicitud_general'
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
  estado?: RequestStatus;
  fecha?: string;
  created_at?: string;
  comentario?: string;
  observaciones?: string;
  respuesta?: string;
  [key: string]: unknown;
}

export interface CreateSolicitudPayload {
  tipo: RequestType;
  comentario?: string;
  [key: string]: unknown;
}
