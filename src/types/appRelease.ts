/**
 * Configuración remota + versiones publicadas de la app — espejo de
 * `App\Http\Controllers\Api\V1\{AppConfigController,AppReleaseController}`
 * en capacitaciones. Ambos endpoints son públicos (sin `auth:sanctum`): la
 * app los consulta antes/justo después de iniciar sesión para decidir si
 * debe bloquear por mantenimiento o por versión mínima.
 */
export interface AppConfig {
  maintenance: boolean;
  /** Legado — se mantiene por compatibilidad hacia atrás mientras el backend no separe minimum_{android,ios}_version. */
  minimum_version: string | null;
  /** Mínimo específico de Android, si el backend ya lo manda — si no, cae en `minimum_version` (ver `resolveMinimumVersionForPlatform`). */
  minimum_android_version?: string | null;
  /** `versionCode` mínimo de Android — puede llegar como número, string numérica o null (ver `normalizeBuildNumber`). */
  minimum_android_build?: RawBuildNumber;
  /** Mínimo específico de iOS, si el backend ya lo manda — si no, cae en `minimum_version`. */
  minimum_ios_version?: string | null;
  /** `buildNumber` mínimo de iOS. */
  minimum_ios_build?: RawBuildNumber;
  latest_version: string | null;
  force_update: boolean;
  message?: string | null;
  features: Record<string, boolean> | null;
}

export type AppReleasePlatform = 'ios' | 'android';

/**
 * `build_number` es lo único confiable para comparar actualizaciones —
 * nunca comparar `version` como string simple (AGENTS.md sección 39). NO se
 * asume que siempre llegue como `number`: el backend (o un JSON mal
 * tipificado) puede mandarlo como string numérica o `null` — se normaliza
 * siempre con `normalizeBuildNumber()` antes de compararlo, nunca se usa
 * crudo.
 */
export type RawBuildNumber = number | string | null | undefined;

export interface AppRelease {
  platform: AppReleasePlatform;
  version: string;
  build_number: RawBuildNumber;
  download_url: string;
  file_size?: number | null;
  sha256?: string | null;
  changelog?: string | null;
  minimum_required: boolean;
  published_at?: string | null;
}
