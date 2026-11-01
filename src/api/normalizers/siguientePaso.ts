import type { ReaperturaDisponible, SiguientePaso } from '@/types/siguientePaso';
import { asArray, asId, asRecord, asRecordOrNull, asString } from '@/utils/normalize';

export function normalizeSiguientePaso(value: unknown): SiguientePaso | null {
  const raw = asRecordOrNull(value);
  if (!raw) return null;
  const accion = asRecordOrNull(raw.accion);
  const tipo = raw.tipo === 'espera' || raw.tipo === 'terminado' ? raw.tipo : 'accion';
  const responsable = asRecord(raw.responsable);
  return {
    tipo,
    estado: asString(asRecord(raw.estado).etiqueta),
    mensaje: asString(raw.mensaje) ?? '',
    responsable: asString(responsable.nombre) ?? asString(responsable.rol),
    accion: accion
      ? { clave: asString(accion.clave) ?? '', etiqueta: asString(accion.etiqueta) ?? '', solo_web: accion.solo_web === true, href: asString(accion.href) }
      : null,
    bloqueos: asArray(raw.bloqueos).filter((v): v is string => typeof v === 'string'),
  };
}

/** `acciones_permitidas` puede traer enlaces de la web (`href`, `solo_web`): la app no los ejecuta. */
export function accionEjecutableEnApp(value: unknown): boolean {
  const raw = asRecord(value);
  return raw.solo_web !== true && !raw.href;
}

export function normalizeReaperturas(value: unknown): ReaperturaDisponible[] {
  return asArray(value).flatMap((item) => {
    const raw = asRecord(item);
    const tipo = asString(raw.tipo);
    const id = asId(raw.id);
    return tipo && id ? [{ tipo, id, etiqueta: asString(raw.etiqueta) ?? 'Decisión' }] : [];
  });
}
