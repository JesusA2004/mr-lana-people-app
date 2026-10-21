import type { ElegibilidadPrestamo } from '@/types/loan';
import { asBoolean, asNumber, asRecord, asRecordOrNull, asString } from '@/utils/normalize';

/**
 * Elegibilidad para pedir préstamo (mínimo 6 meses completos de antigüedad). La
 * decide SIEMPRE el backend con su fecha; esta capa solo la lee y arma los
 * textos de la pantalla. Probada en `utils/__tests__/prestamoElegibilidad.test.ts`.
 */
export function normalizeElegibilidadPrestamo(value: unknown): ElegibilidadPrestamo | null {
  const raw = asRecordOrNull(value);
  if (!raw || typeof raw.cumple !== 'boolean') return null;
  const antiguedad = asRecordOrNull(raw.antiguedad);
  return {
    cumple: asBoolean(raw.cumple),
    meses_minimos: asNumber(raw.meses_minimos) ?? 6,
    fecha_ingreso: asString(raw.fecha_ingreso),
    antiguedad: antiguedad
      ? { anios: asNumber(antiguedad.anios) ?? 0, meses: asNumber(antiguedad.meses) ?? 0, dias: asNumber(antiguedad.dias) ?? 0 }
      : null,
    antiguedad_meses: asNumber(raw.antiguedad_meses),
    antiguedad_texto: asString(raw.antiguedad_texto),
    disponible_desde: asString(raw.disponible_desde),
    disponible_desde_texto: asString(raw.disponible_desde_texto),
    fecha_servidor: asString(raw.fecha_servidor),
    mensaje: asString(raw.mensaje),
  };
}

/** `{ data: {...} }` o el objeto directo. */
export function elegibilidadDesdeRespuesta(payload: unknown): ElegibilidadPrestamo | null {
  const root = asRecord(payload);
  return normalizeElegibilidadPrestamo('data' in root ? root.data : root);
}

/** dd/mm/aaaa: el texto del backend o, si no viene, la fecha `YYYY-MM-DD` reordenada (sin pasar por la zona del teléfono). */
export function fechaDisponibleTexto(e: Pick<ElegibilidadPrestamo, 'disponible_desde' | 'disponible_desde_texto'>): string | null {
  if (e.disponible_desde_texto) return e.disponible_desde_texto;
  const m = e.disponible_desde ? /^(\d{4})-(\d{2})-(\d{2})/.exec(e.disponible_desde) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

/** Texto de respaldo si el backend no manda `mensaje` (mismo texto que el backend). */
export function mensajeNoElegible(mesesMinimos: number, fecha: string | null): string {
  const base = `Necesitas mínimo ${mesesMinimos} meses de antigüedad para solicitar un préstamo.`;
  return fecha ? `${base} Podrás solicitarlo a partir del ${fecha}.` : base;
}

export interface VistaElegibilidad {
  botonTitulo: string;
  botonHabilitado: boolean;
  /** «Antigüedad actual: 5 meses 12 días» (null si el backend no la conoce). */
  antiguedad: string | null;
  /** «Disponible desde: 08/11/2026» (null si no hay fecha de ingreso). */
  disponibleDesde: string | null;
  /** Solo la fecha dd/mm/aaaa. */
  fechaDisponible: string | null;
  /** TarjetaAviso cuando NO cumple. */
  aviso: { titulo: string; mensaje: string } | null;
}

/**
 * Qué muestra la pantalla de «Solicitar préstamo». Sin elegibilidad
 * (backend anterior o error de red) no se bloquea: el backend vuelve a
 * validar al crear y responde 422 con su mensaje.
 */
export function vistaElegibilidad(e: ElegibilidadPrestamo | null | undefined): VistaElegibilidad {
  if (!e) return { botonTitulo: 'Solicitar préstamo', botonHabilitado: true, antiguedad: null, disponibleDesde: null, fechaDisponible: null, aviso: null };
  const fecha = fechaDisponibleTexto(e);
  const base = {
    antiguedad: e.antiguedad_texto ? `Antigüedad actual: ${e.antiguedad_texto}` : null,
    disponibleDesde: fecha ? `Disponible desde: ${fecha}` : null,
    fechaDisponible: fecha,
  };
  if (e.cumple) return { ...base, botonTitulo: 'Solicitar préstamo', botonHabilitado: true, aviso: null };
  return {
    ...base,
    botonTitulo: `Disponible al cumplir ${e.meses_minimos} meses`,
    botonHabilitado: false,
    aviso: {
      titulo: 'Aún no puedes solicitar un préstamo',
      mensaje: e.mensaje ?? mensajeNoElegible(e.meses_minimos, fecha),
    },
  };
}
