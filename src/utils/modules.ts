import type { MobileBootstrapFeatures } from '@/types/mobileBootstrap';

/**
 * Visibilidad de los módulos del ciclo laboral (backend 2026-09-22).
 *
 * Regla (documentada en `docs/MOBILE_BACKEND_SYNC_2026_09_22.md`):
 *  1. Si `mobile/bootstrap` manda el feature EXPLÍCITO (`true/false`), manda.
 *  2. Si no lo manda (hoy `MobileBootstrapService::features()` no incluye
 *     ninguno de estos), el módulo es parte ESTABLE de la API:
 *      - autoservicio del colaborador → visible (el backend acota todo a
 *        la sesión; no existe permiso Spatie para "ver lo propio");
 *      - operación RH/Dirección/Jurídico → visible SOLO con el permiso real
 *        que exige el controlador/Policy (nunca por nombre de rol).
 *
 * Esto sustituye el fail-CLOSED anterior (`isExperimentalFeatureEnabled`)
 * que ocultaba "documentos laborales" porque el endpoint no existía el
 * 15/09 — hoy existe y está protegido por Policy.
 */

export type SelfServiceModule = 'documentos_laborales' | 'contratos' | 'recibos' | 'prestamos' | 'jerarquia' | 'tareas' | 'equipo' | 'evaluaciones';

export function isSelfServiceModuleEnabled(features: MobileBootstrapFeatures | null | undefined, module: SelfServiceModule): boolean {
  const explicit = features?.[module];
  return explicit === undefined ? true : explicit === true;
}

export type RhModule =
  | 'documentos_laborales'
  | 'contratos'
  | 'evaluaciones'
  | 'cierres'
  | 'recibos'
  | 'prestamos'
  | 'actas'
  | 'plantilla'
  | 'indicadores'
  | 'vacantes'
  | 'organigrama_personas'
  | 'plantillas_documentales';

/**
 * Permiso(s) que protegen el endpoint de LISTADO de cada módulo en el
 * backend (basta uno). Espejo de los `abort_unless(...->can(...))` y
 * Policies de `App\Http\Controllers\Api\V1\Rh\*` y `EvaluacionController`.
 */
export const RH_MODULE_PERMISSIONS: Record<RhModule, string[]> = {
  documentos_laborales: ['documentos_laborales.ver'],
  contratos: ['contratos.ver'],
  evaluaciones: ['evaluaciones.ver', 'evaluaciones.autorizar'],
  cierres: ['cierres.ver'],
  recibos: ['nomina.recibos.ver'],
  prestamos: ['prestamos.ver'],
  actas: ['actas.ver'],
  plantilla: ['headcount.ver'],
  indicadores: ['indicadores.ver'],
  vacantes: ['vacantes.ver'],
  organigrama_personas: ['organigrama.ver'],
  plantillas_documentales: ['plantillas_documentales.ver'],
};

/** Clave del feature explícito en `mobile/bootstrap` (si el backend la agrega algún día). */
const RH_MODULE_FEATURE: Partial<Record<RhModule, string>> = {
  documentos_laborales: 'rh_documentos_laborales',
  cierres: 'rh_cierres',
  recibos: 'rh_recibos',
  prestamos: 'rh_prestamos',
  actas: 'rh_actas',
  indicadores: 'rh_indicadores',
};

export function hasAnyPermission(permissions: string[] | undefined, required: string[]): boolean {
  return Array.isArray(permissions) && required.some((permission) => permissions.includes(permission));
}

export function isRhModuleEnabled(
  features: MobileBootstrapFeatures | null | undefined,
  permissions: string[] | undefined,
  module: RhModule,
): boolean {
  const featureKey = RH_MODULE_FEATURE[module];
  const explicit = featureKey ? features?.[featureKey] : undefined;
  if (explicit === false) return false;
  return hasAnyPermission(permissions, RH_MODULE_PERMISSIONS[module]);
}

/**
 * Secciones del detalle RH de un colaborador — cada una se muestra SOLO
 * con el permiso que exige su endpoint (`ColaboradorPolicy`, etc.).
 */
export type ColaboradorSection = 'alta' | 'expediente' | 'contratos' | 'documentos_laborales' | 'recibos' | 'prestamos' | 'actas' | 'jerarquia' | 'cierre';

export const COLABORADOR_SECTION_PERMISSIONS: Record<ColaboradorSection, string[]> = {
  alta: ['colaboradores.alta', 'expedientes.ver_todos', 'expedientes.ver_sucursal'],
  expediente: ['rh.expedientes.detalle'],
  contratos: ['contratos.ver'],
  documentos_laborales: ['documentos_laborales.ver'],
  recibos: ['nomina.recibos.ver'],
  prestamos: ['prestamos.ver'],
  actas: ['actas.ver'],
  jerarquia: ['organigrama.ver', 'rh.colaboradores.detalle'],
  cierre: ['cierres.ver', 'cierres.gestionar'],
};

export function visibleColaboradorSections(permissions: string[] | undefined): ColaboradorSection[] {
  return (Object.keys(COLABORADOR_SECTION_PERMISSIONS) as ColaboradorSection[]).filter((section) =>
    hasAnyPermission(permissions, COLABORADOR_SECTION_PERMISSIONS[section]),
  );
}
