export interface VacationBalance {
  antiguedad_anios?: number;
  vigencia_inicio?: string | null;
  vigencia_fin?: string | null;
  dias_generados?: number;
  dias_usados?: number;
  dias_en_solicitud?: number;
  dias_disponibles?: number;
  [key: string]: unknown;
}

export interface VacationRequest {
  id: number | string;
  fecha_inicio?: string;
  fecha_fin?: string;
  dias_solicitados?: number;
  estado?: string;
  estado_etiqueta?: string;
  comentario?: string;
  motivo_rechazo?: string;
  creada_en?: string;
  [key: string]: unknown;
}

export interface CreateVacationRequestPayload {
  fecha_inicio: string;
  fecha_fin: string;
  dias_solicitados: number;
  comentario?: string;
}
