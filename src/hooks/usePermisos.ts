import { useMemo } from 'react';

import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import type { MobileBootstrap, MobileBootstrapCapabilities, MobileBootstrapFeatures } from '@/types/mobileBootstrap';
import { hasPermission } from '@/utils/capabilities';
import { experienceAvailability, type ExperienceAvailability } from '@/utils/experience';
import { isFeatureEnabled } from '@/utils/featureFlags';
import { hasAnyPermission, isRhModuleEnabled, isSelfServiceModuleEnabled, type RhModule, type SelfServiceModule } from '@/utils/modules';

export interface Permisos {
  /** `mobile/bootstrap` ya respondió (antes de eso nada operativo se ofrece). */
  cargado: boolean;
  /** Permiso exacto de Spatie (`user.permissions`). */
  puede: (permiso: string) => boolean;
  /** Basta uno de los permisos. */
  puedeAlguno: (permisos: string[]) => boolean;
  /** Bandera de acción del bootstrap (`ciclo_laboral.acciones.<clave>`); ausente = no. */
  accion: (clave: string) => boolean;
  /** Módulo de Gestión RH (permiso del endpoint + feature explícito). */
  moduloRh: (modulo: RhModule) => boolean;
  /** Módulo de autoservicio (feature explícito o API estable). */
  autoservicio: (modulo: SelfServiceModule) => boolean;
  /** Feature flag core (fail-open hasta que el bootstrap lo apague). */
  feature: (clave: keyof MobileBootstrapFeatures) => boolean;
  experiencias: ExperienceAvailability;
  /** Capacidades calculadas en backend (`employee`, `rh`, `manager`, `director`). */
  capacidades: MobileBootstrapCapabilities | undefined;
  /**
   * La cuenta tiene Gestión RH: TODO lo operativo (aprobar, evaluar, su
   * equipo) vive ahí y no se mezcla en Mi espacio (misma regla que la web,
   * docs/ROLES_Y_NAVEGACION.md). Una cuenta sin Gestión RH (p. ej. un
   * supervisor) sigue resolviendo sus vistos buenos desde Mi espacio.
   */
  operacionEnGestionRh: boolean;
}

export function construirPermisos(data: MobileBootstrap | undefined): Permisos {
  const permisos = data?.user.permissions;
  const features = data?.features;
  const acciones = data?.ciclo_laboral?.acciones;
  const experiencias = experienceAvailability(data?.capabilities, features);

  return {
    cargado: Boolean(data),
    puede: (permiso) => hasPermission(permisos, permiso),
    puedeAlguno: (lista) => hasAnyPermission(permisos, lista),
    accion: (clave) => acciones?.[clave] === true,
    moduloRh: (modulo) => isRhModuleEnabled(features, permisos, modulo),
    autoservicio: (modulo) => isSelfServiceModuleEnabled(features, modulo),
    feature: (clave) => isFeatureEnabled(features, clave),
    experiencias,
    capacidades: data?.capabilities,
    operacionEnGestionRh: experiencias.rh,
  };
}

/**
 * ÚNICA puerta de la app para decidir si un botón/atajo/pestaña se ofrece.
 * Todo sale de `mobile/bootstrap` (permisos de Spatie, banderas de acción y
 * features calculadas en el backend) — nunca del nombre del rol. Para un
 * recurso concreto manda SIEMPRE su bandera por ítem (`acciones_permitidas`,
 * `puede_*`, `flujo.puede_actuar_usuario_actual`); esto cubre accesos y
 * módulos. El backend vuelve a autorizar cada acción (Policy).
 */
export function usePermisos(): Permisos {
  const bootstrap = useMobileBootstrap(true);
  const data = bootstrap.data;
  return useMemo(() => construirPermisos(data), [data]);
}
