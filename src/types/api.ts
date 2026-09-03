/**
 * Formas genéricas de respuesta que expone la API Laravel de MR. LANA PEOPLE.
 * El backend suele envolver el recurso principal en `{ data: ... }`
 * (API Resources de Laravel). `extractData` en `src/api/client.ts`
 * centraliza ese "desenvolvimiento" para no repetirlo en cada pantalla.
 */

export interface ApiErrorPayload {
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginationMeta {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: PaginationMeta;
  links?: Record<string, unknown>;
}
