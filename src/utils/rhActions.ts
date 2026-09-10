import type { AllowedAction } from '@/types/rh';

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
