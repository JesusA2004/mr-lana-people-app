import type { AllowedAction, RhSolicitud } from '@/types/rh';

/**
 * Único punto de verdad para leer `acciones_permitidas` (AGENTS.md sección
 * 8): la app NUNCA decide qué botón mostrar por su cuenta, solo pregunta si
 * la acción está en el arreglo que mandó el backend. Si `acciones_permitidas`
 * no trae `"aprobar"`, el botón Aprobar no existe — no se deshabilita, no
 * se muestra "próximamente".
 */
export function hasAction(actions: AllowedAction[] | undefined, action: AllowedAction): boolean {
  return Array.isArray(actions) && actions.includes(action);
}

export function canApprove(actions?: AllowedAction[]): boolean {
  return hasAction(actions, 'aprobar');
}

export function canReject(actions?: AllowedAction[]): boolean {
  return hasAction(actions, 'rechazar');
}

export function canRequestCorrection(actions?: AllowedAction[]): boolean {
  return hasAction(actions, 'solicitar_correccion');
}

export function canAuthorizeChange(actions?: AllowedAction[]): boolean {
  return hasAction(actions, 'autorizar_cambio');
}

/**
 * Seguridad para las dos solicitudes "complejas" (sección 5/14 del encargo
 * 2026-09-15): `Api\V1\Rh\SolicitudController::show()` TODAVÍA no
 * serializa los campos que RH necesita para aprobar con criterio un
 * préstamo (`monto_solicitado`/`plazo_meses`) o una baja de colaborador
 * (`colaborador_objetivo`/`fecha_efectiva`/`tipo_baja`), aunque el modelo sí
 * los tenga.
 *
 * Mientras eso sea cierto, la app BLOQUEA "Aprobar" en móvil para esos dos
 * tipos — nunca deja aprobar a ciegas un monto o una baja que ni siquiera
 * se puede leer — y ofrece completar la revisión en el Portal RH. "Ver",
 * "Rechazar" y "Pedir corrección" siguen intactos: solo dependen de
 * `acciones_permitidas`, como cualquier otro tipo.
 *
 * Esta función deja de bloquear SOLA en cuanto el backend mande esos campos
 * (comprueba su presencia real, nunca el tipo de la solicitud a ciegas):
 * el día que `Rh\SolicitudController` los serialice, `Aprobar` reaparece
 * sin tocar una línea de este archivo.
 */
export function puedeAprobarSolicitudComplejaMovil(solicitud: Pick<RhSolicitud, 'tipo' | 'monto_solicitado' | 'plazo_meses' | 'colaborador_objetivo' | 'fecha_efectiva' | 'tipo_baja'>): boolean {
  if (solicitud.tipo === 'prestamo') {
    return solicitud.monto_solicitado !== undefined && solicitud.monto_solicitado !== null;
  }

  if (solicitud.tipo === 'baja_colaborador') {
    return Boolean(solicitud.colaborador_objetivo) && Boolean(solicitud.fecha_efectiva) && Boolean(solicitud.tipo_baja);
  }

  return true;
}

/** true si el tipo de la solicitud es uno de los que requieren la revisión completa de arriba. */
export function esSolicitudCompleja(tipo: string | undefined): boolean {
  return tipo === 'prestamo' || tipo === 'baja_colaborador';
}
