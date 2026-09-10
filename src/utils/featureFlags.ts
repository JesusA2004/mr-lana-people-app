import type { MobileBootstrapFeatures } from '@/types/mobileBootstrap';

/**
 * Único lugar donde se lee un feature flag remoto de `mobile/bootstrap`
 * (AGENTS.md sección 16: "que no se muestren cuando backend los
 * desactive... las rutas profundas también deben manejarlo", no solo la
 * card del home). Fail-open (`true`) mientras `features` todavía no cargó
 * (bootstrap en null/undefined) para no ocultar contenido real por un
 * instante mientras arranca la app — una vez que el bootstrap resuelve, el
 * valor explícito del backend es la única autoridad.
 */
export function isFeatureEnabled(features: MobileBootstrapFeatures | null | undefined, key: keyof MobileBootstrapFeatures): boolean {
  if (!features) return true;
  return features[key] !== false;
}
