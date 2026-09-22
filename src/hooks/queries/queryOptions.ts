import { isAxiosError } from 'axios';

/**
 * Reintento de GET: nunca ante 4xx (403 sin permiso, 404 cuenta sin
 * colaborador vinculado, 422) — reintentar no cambia la respuesta y solo
 * retrasa el estado vacío/sin permiso. Ante red/5xx, un solo reintento
 * (mismo criterio que el default de `queryClient`).
 */
export function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < 1;
}

/**
 * Opciones para mutaciones SENSIBLES (firmar, visto bueno, autorizar,
 * activar, cerrar, pagar...): `networkMode: 'always'` hace que sin
 * conexión fallen de inmediato con el error de red normalizado, en vez de
 * quedar "pausadas" y ejecutarse solas al reconectar. Una firma o
 * autorización jamás se simula ni se difiere offline: requiere la
 * confirmación real del backend en ese momento.
 */
export const SENSITIVE_MUTATION = { networkMode: 'always', retry: 0 } as const;
