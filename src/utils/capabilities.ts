import type { MobileBootstrapCapabilities, MobileBootstrapFeatures } from '@/types/mobileBootstrap';

/**
 * Única función que decide si la app ofrece la experiencia "Gestión RH"
 * (selector, switcher, tabs RH). Nunca por nombre de rol (AGENTS.md sección
 * 2/59): requiere TANTO el permiso real (`capabilities.rh`, calculado en
 * backend a partir de Spatie) COMO el feature flag remoto
 * (`features.rh_mobile`) — así RH puede apagar la experiencia móvil
 * completa sin tocar permisos de nadie.
 */
export function canUseRhExperience(capabilities: MobileBootstrapCapabilities, features: MobileBootstrapFeatures): boolean {
  return capabilities.rh === true && features.rh_mobile === true;
}

/**
 * Permiso real (Spatie, `mobile/bootstrap` → `user.permissions`) — usado
 * donde el backend NO manda `acciones_permitidas` en el recurso (ej.
 * `rh/expedientes`, ver `database/seeders/RolesYPermisosSeeder.php` bloque
 * "Backend movil v5"). Sigue sin ser un `if role === "rh_admin"`: se
 * pregunta por el permiso exacto, nunca por el nombre del rol.
 */
export function hasPermission(permissions: string[] | undefined, permission: string): boolean {
  return Array.isArray(permissions) && permissions.includes(permission);
}
