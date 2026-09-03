export interface VacationBalance {
  dias_generados?: number;
  dias_utilizados?: number;
  dias_disponibles?: number;
  dias_en_solicitud?: number;
  [key: string]: unknown;
}

export interface VacationRequest {
  id: number | string;
  fecha_inicio?: string;
  fecha_fin?: string;
  dias?: number;
  estado?: string;
  comentario?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface CreateVacationRequestPayload {
  fecha_inicio: string;
  fecha_fin: string;
  comentario?: string;
}
