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
  /** Descarga directa del APK de Android, `null` si no hay release con archivo. */
  download_url?: string | null;
  /** Página pública `/app` del portal. */
  update_url?: string | null;
  /**
   * Distribución iOS. El backend manda ambos `null` hasta que exista un
   * release publicado con esos campos — nunca se hardcodea una URL de
   * TestFlight/App Store en la app.
   */
  ios?: {
    install_url?: string | null;
    store_url?: string | null;
  } | null;
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
  /**
   * Descarga directa del archivo (APK de Android). `AppReleaseController::paraApi`
   * la manda `null` cuando el release no tiene archivo — que es justo el
   * caso de iOS. Antes se tipaba como `string` a secas, lo que hacía creer
   * que siempre venía: en iOS dejaba la pantalla de actualización sin a
   * dónde ir. Usa `resolveReleaseUrl()` en vez de leerla directo.
   */
  download_url: string | null;
  /** Instalación fuera de tienda (TestFlight/ad-hoc en iOS). `null` hasta que exista. */
  install_url?: string | null;
  /** Ficha en App Store / Play Store. `null` hasta que exista. */
  store_url?: string | null;
  file_size?: number | null;
  sha256?: string | null;
  changelog?: string | null;
  minimum_required: boolean;
  published_at?: string | null;
}
