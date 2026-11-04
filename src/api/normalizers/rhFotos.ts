import type { PaginatedResponse } from '@/types/api';
import type { RhColaborador, RhColaboradorResumen, RhIncorporacion, RhSolicitud } from '@/types/rh';
import { asArray, asFotoUrl, asRecord, asRecordOrNull, type UnknownRecord } from '@/utils/normalize';

/**
 * `foto_url` en los recursos de RH que hoy se consumen casi tal cual del
 * backend (`docs/FOTO_EXPEDIENTE.md`, «foto_url en respuestas que listan
 * personas»). Solo se normaliza la foto: cadena no vacía o `null` (⇒
 * iniciales); el resto del recurso se conserva como llegó.
 */

function conFoto<T>(raw: UnknownRecord): T & { foto_url: string | null } {
  return { ...(raw as T), foto_url: asFotoUrl(raw.foto_url) };
}

/** `colaborador` anidado (`{ id, nombre, foto_url, ... }`); sin objeto se deja tal cual llegó. */
function colaboradorConFoto(value: unknown): RhColaboradorResumen {
  const raw = asRecordOrNull(value);
  return raw ? conFoto<RhColaboradorResumen>(raw) : (value as RhColaboradorResumen);
}

/** `GET /rh/colaboradores` (`data[].foto_url`) y `/{id}` (`data.foto_url`). */
export function normalizeRhColaborador(value: unknown): RhColaborador {
  return conFoto<RhColaborador>(asRecord(value));
}

/** `GET /rh/solicitudes[/{id}]` → `colaborador.foto_url`. */
export function normalizeRhSolicitud(value: unknown): RhSolicitud {
  const raw = asRecord(value);
  return { ...(raw as RhSolicitud), colaborador: colaboradorConFoto(raw.colaborador) };
}

/** `GET /rh/incorporaciones[/{id}]` → `colaborador.foto_url`. */
export function normalizeRhIncorporacion(value: unknown): RhIncorporacion {
  const raw = asRecord(value);
  return { ...(raw as RhIncorporacion), colaborador: colaboradorConFoto(raw.colaborador) };
}

/** Paginador `{ data, meta, links }` con cada fila normalizada; `meta`/`links` se conservan. */
export function normalizeRhPagina<T>(payload: unknown, item: (raw: unknown) => T): PaginatedResponse<T> {
  const root = asRecord(payload);
  return { ...(root as Omit<PaginatedResponse<T>, 'data'>), data: asArray(root.data).map(item) };
}
