import type { MobileBootstrapCapabilities, MobileBootstrapFeatures } from '@/types/mobileBootstrap';

import { canUseRhExperience } from './capabilities';

export type ExperienceKind = 'colaborador' | 'rh';

export interface ExperienceAvailability {
  /** Mi espacio: la cuenta tiene expediente de colaborador (`capabilities.employee`). */
  colaborador: boolean;
  /** Gestión RH: permiso real (`capabilities.rh`) + feature `rh_mobile`. */
  rh: boolean;
}

/**
 * Qué experiencias puede usar esta cuenta. Sale SOLO de `mobile/bootstrap`
 * (capabilities/features calculadas en backend a partir de permisos) —
 * nunca del nombre del rol. Cambiar de experiencia NO cambia roles ni
 * sesión: mismo usuario, mismo token.
 */
export function experienceAvailability(
  capabilities: MobileBootstrapCapabilities | undefined,
  features: MobileBootstrapFeatures | undefined,
): ExperienceAvailability {
  const rh = capabilities && features ? canUseRhExperience(capabilities, features) : false;
  // Backend anterior (sin la bandera real) mandaba `employee: true` siempre.
  const colaborador = capabilities?.employee !== false;
  return { colaborador, rh };
}

/** Puede alternar entre ambas (mostrar selector / botón "Cambiar a…"). */
export function canSwitchExperience(availability: ExperienceAvailability): boolean {
  return availability.colaborador && availability.rh;
}

/**
 * Experiencia EFECTIVA a montar.
 * - Solo una disponible → esa, sin preguntar (y sin ofrecer la otra).
 * - Ambas → la guardada; `null` = primera vez, se pregunta.
 * - Una guardada que ya no es válida (perdió el permiso RH) → la otra.
 * - Ninguna (caso raro) → Mi espacio, que maneja su propio "sin expediente".
 */
export function resolveExperience(stored: ExperienceKind | null, availability: ExperienceAvailability): ExperienceKind | null {
  if (availability.colaborador && availability.rh) return stored;
  if (availability.rh) return 'rh';
  return 'colaborador';
}

/** Preferencia guardada que ya no corresponde y debe corregirse (p. ej. perdió RH). */
export function shouldCorrectStoredExperience(stored: ExperienceKind | null, availability: ExperienceAvailability): ExperienceKind | null {
  const effective = resolveExperience(stored, availability);
  return effective !== null && stored !== null && effective !== stored ? effective : null;
}
