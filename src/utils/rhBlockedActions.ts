import { getValidationErrors } from '@/utils/errors';

/**
 * Bloqueos de aprobación que el backend impone a una BAJA de colaborador
 * (`SolicitudesService::cambiarEstado()`), devueltos como 422 con una clave
 * de validación específica:
 *
 *   evidencia → "Adjunta la evidencia/firma del gerente antes de aprobar
 *                esta baja."
 *   finiquito → "Calcula y revisa el finiquito antes de aprobar esta baja."
 *
 * La app NO replica esas reglas (no sabe si hay finiquito revisado, ni si
 * quien aprueba tiene `solicitudes.bajas.omitir_finiquito`): deja que el
 * backend decida y, cuando bloquea, muestra su mensaje EXACTO. Lo único que
 * agrega es el camino de salida — el cálculo de finiquito solo existe en el
 * Portal RH web (sección 26/27).
 */

export interface BlockedApproval {
  /** Mensaje exacto del backend, sin reinterpretar. */
  message: string;
  /** Ruta web donde se destraba, o `undefined` si se resuelve en la app. */
  webPath?: string;
  /** Texto del CTA cuando hay `webPath`. */
  webCtaLabel?: string;
}

const BLOCKERS: Record<string, { webPath?: string; webCtaLabel?: string }> = {
  // El finiquito se calcula y revisa únicamente en el portal web.
  finiquito: { webPath: 'rh/finiquitos', webCtaLabel: 'Completar en portal web' },
  // La evidencia sí se puede adjuntar desde la app, en la propia solicitud.
  evidencia: {},
};

/**
 * Devuelve el bloqueo si el error es uno de estos 422 dirigidos; `null` para
 * cualquier otro error (red, 403, conflicto de concurrencia...), que cada
 * pantalla sigue manejando como siempre.
 */
export function blockedApprovalReason(error: unknown): BlockedApproval | null {
  const validation = getValidationErrors(error);
  if (!validation) return null;

  for (const [key, config] of Object.entries(BLOCKERS)) {
    const message = validation[key]?.[0];
    if (message) return { message, ...config };
  }

  return null;
}
