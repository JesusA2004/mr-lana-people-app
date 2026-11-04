import { normalizeError } from './errors';

/**
 * Reintento automático con espera creciente (backoff exponencial) para
 * subidas: una foto o documento que falla por la señal del celular casi
 * siempre entra al segundo intento. Solo se reintenta lo que tiene sentido
 * repetir (sin conexión, timeout, 5xx); un 4xx (validación, permiso) es una
 * respuesta definitiva y se devuelve de inmediato.
 */
export interface OpcionesReintento {
  /** Reintentos ADEMÁS del primer intento (default 2 → hasta 3 llamadas). */
  reintentos?: number;
  /** Espera antes del primer reintento; se duplica en cada uno (default 1000 ms → 1 s, 2 s). */
  esperaBaseMs?: number;
  esReintentable?: (error: unknown) => boolean;
  /** Se avisa ANTES de esperar cada reintento (intento = 1 para el primer reintento). */
  alReintentar?: (intento: number, error: unknown) => void;
  /** Inyectable en pruebas. */
  esperar?: (ms: number) => Promise<void>;
}

/** Error de red/timeout o 5xx: vale la pena repetir la petición. */
export function esErrorReintentable(error: unknown): boolean {
  const { status, isNetworkError } = normalizeError(error);
  return Boolean(isNetworkError) || (status !== undefined && status >= 500);
}

export function esperaDeReintento(intento: number, esperaBaseMs = 1000): number {
  return esperaBaseMs * 2 ** Math.max(0, intento - 1);
}

const esperarPorDefecto = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function conReintentos<T>(fn: (intento: number) => Promise<T>, opciones: OpcionesReintento = {}): Promise<T> {
  const { reintentos = 2, esperaBaseMs = 1000, esReintentable = esErrorReintentable, alReintentar, esperar = esperarPorDefecto } = opciones;

  for (let intento = 0; ; intento++) {
    try {
      return await fn(intento);
    } catch (error) {
      if (intento >= reintentos || !esReintentable(error)) throw error;
      alReintentar?.(intento + 1, error);
      await esperar(esperaDeReintento(intento + 1, esperaBaseMs));
    }
  }
}
