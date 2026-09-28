import { fromApiDateString } from './dates';

/**
 * Días abiertos desde `fecha_apertura` — espejo de `App\Models\Vacante::
 * diasAbierta()`, que el endpoint móvil (`Api\V1\Rh\VacanteController::
 * index()`) todavía no serializa (solo lo manda `filas()`, usado por la
 * web). Se calcula en el cliente con la misma fórmula (diferencia de días
 * naturales contra hoy) en vez de pedir un cambio de backend para un dato
 * derivable de un campo que ya llega. Para vacantes cerradas/canceladas es
 * una aproximación (el backend congela el conteo en `fecha_cierre`, que la
 * API móvil no manda) — aceptable porque son un filtro secundario, nunca la
 * vista por defecto.
 */
export function diasVacanteAbierta(fechaApertura?: string | null): number | null {
  const apertura = fromApiDateString(fechaApertura);
  if (!apertura) return null;
  const hoy = new Date();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const aperturaUtc = Date.UTC(apertura.getFullYear(), apertura.getMonth(), apertura.getDate());
  const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.max(0, Math.round((hoyUtc - aperturaUtc) / MS_PER_DAY));
}
