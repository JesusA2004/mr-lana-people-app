import type { MobileBootstrapFeatures } from '@/types/mobileBootstrap';
import { hasPermission } from '@/utils/capabilities';

/**
 * Feature flag CORE/existente (`incorporacion`, `expedientes`, `solicitudes`,
 * `vacaciones`, `notificaciones`, `push`, `rh_mobile`, `cumpleanos`, ...):
 * fail-OPEN mientras `features` todavía no cargó, o mientras el backend no
 * mande explícitamente la clave. Estos módulos ya existían antes de esta
 * auditoría y siempre estuvieron disponibles — apagar contenido real por
 * un instante mientras arranca la app (o por un backend viejo que aún no
 * manda la clave) sería peor que el riesgo de mostrarlo un momento de más.
 * Una vez que el bootstrap resuelve, el valor explícito del backend manda.
 */
export function isFeatureEnabled(features: MobileBootstrapFeatures | null | undefined, key: keyof MobileBootstrapFeatures): boolean {
  if (!features) return true;
  return features[key] !== false;
}

/**
 * Feature flag EXPERIMENTAL/nueva (`formatos`, `documentos_laborales`,
 * `document_extraction`): fail-CLOSED. Bug de producto corregido en esta
 * auditoría — estos tres módulos estaban fail-open, así que si el backend
 * real (que hoy NO manda ninguna de estas tres claves en
 * `mobile/bootstrap`) simplemente no las incluye, la app los mostraba de
 * todos modos. Documentos laborales y el wizard de generar formato de hecho
 * apuntan a endpoints que hoy responden 404 — mostrarlos sin que el
 * backend los haya encendido explícitamente le da al usuario un módulo
 * roto. Ausente/`undefined` = `false` SIEMPRE, sin importar si `features`
 * ya cargó o no. Ver `docs/BACKEND_GAPS_FINAL.md`.
 */
export function isExperimentalFeatureEnabled(features: MobileBootstrapFeatures | null | undefined, key: keyof MobileBootstrapFeatures): boolean {
  return features?.[key] === true;
}

/**
 * Organigrama es un caso especial: el endpoint real (`GET
 * /rh/jerarquia-puestos`) YA está implementado y funcionando (confirmado
 * contra el backend real), pero `mobile/bootstrap` todavía no manda
 * `features.organigrama`. En vez de fail-closed puro (que ocultaría un
 * módulo que sí funciona) ni fail-open puro (que lo mostraría a cualquiera
 * sin checar permiso), se resuelve así:
 *   1. Si el backend YA manda `features.organigrama` explícito, ese valor
 *      manda siempre — es la señal más confiable posible.
 *   2. Si no lo manda todavía, cae en el mismo permiso que protege el
 *      endpoint en el backend (`puestos.administrar`, ver
 *      `App\Policies\PuestoPolicy`) — un colaborador sin ese permiso jamás
 *      ve el módulo aunque el endpoint exista, y quien sí lo tiene no se
 *      queda esperando a que el backend agregue el flag.
 * Preferible que el backend mande el feature explícito — ver
 * `docs/BACKEND_GAPS_FINAL.md`.
 */
export function isOrganigramaEnabled(
  features: MobileBootstrapFeatures | null | undefined,
  permissions: string[] | undefined,
): boolean {
  const explicit = features?.organigrama;
  if (explicit !== undefined) return explicit === true;
  return hasPermission(permissions, 'puestos.administrar');
}
