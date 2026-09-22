/**
 * Helpers de normalización `unknown → tipo interno estable` para los
 * contratos del ciclo laboral (backend 2026-09-22). Laravel serializa los
 * `decimal` como string (`"1500.00"`) y los booleanos de columnas nullable
 * pueden llegar como `0/1` — estos helpers absorben esas variaciones en UN
 * solo lugar para que ninguna pantalla haga `Number(x)` suelto.
 *
 * Nunca inventan datos: un valor ausente o inválido regresa `null`
 * (numérico/texto) o `[]` (listas), nunca un 0 ni un texto por defecto.
 */

export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

export function asRecordOrNull(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Número finito o `null` — acepta `1500`, `"1500.00"`, `"1,500.00"`. */
export function asNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function asString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

export function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

/** `true/false` explícitos, `null` cuando el backend no lo sabe (ej. `recomienda_renovar` sin capturar). */
export function asNullableBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  return asBoolean(value);
}

export function asId(value: unknown): number | null {
  const n = asNumber(value);
  return n !== null && Number.isInteger(n) ? n : null;
}

export function asStringArray(value: unknown): string[] {
  return asArray(value).filter((item): item is string => typeof item === 'string');
}

/** Envoltura `{ data: [...] , meta }` de `RespondePaginado` (ciclo laboral) normalizada. */
export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    [key: string]: unknown;
  };
}

export function normalizePaginated<T>(payload: unknown, item: (raw: unknown) => T): Paginated<T> {
  const root = asRecord(payload);
  const meta = asRecord(root.meta);
  const data = asArray(root.data).map(item);
  return {
    data,
    meta: {
      ...meta,
      current_page: asNumber(meta.current_page) ?? 1,
      per_page: asNumber(meta.per_page) ?? data.length,
      total: asNumber(meta.total) ?? data.length,
      last_page: asNumber(meta.last_page) ?? 1,
    },
  };
}

/** `getNextPageParam` compartido para listas `RespondePaginado`. */
export function nextPageOf(page: Paginated<unknown>): number | undefined {
  const { current_page, last_page } = page.meta;
  return current_page < last_page ? current_page + 1 : undefined;
}

/** Referencia `{ id, nombre, numero_empleado }` que el backend repite en casi todos los recursos del ciclo laboral. */
export interface ColaboradorRef {
  id: number;
  nombre: string;
  numero_empleado: string | null;
}

export function normalizeColaboradorRef(value: unknown): ColaboradorRef | null {
  const raw = asRecordOrNull(value);
  if (!raw) return null;
  const id = asId(raw.id);
  if (id === null) return null;
  return {
    id,
    nombre: asString(raw.nombre) ?? '',
    numero_empleado: asString(raw.numero_empleado),
  };
}
