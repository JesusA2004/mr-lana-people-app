/**
 * Configuración remota + versiones publicadas de la app — espejo de
 * `App\Http\Controllers\Api\V1\{AppConfigController,AppReleaseController}`
 * en capacitaciones. Ambos endpoints son públicos (sin `auth:sanctum`): la
 * app los consulta antes/justo después de iniciar sesión para decidir si
 * debe bloquear por mantenimiento o por versión mínima.
 */
export interface AppConfig {
  maintenance: boolean;
  minimum_version: string | null;
  latest_version: string | null;
  force_update: boolean;
  message?: string | null;
  features: Record<string, boolean> | null;
}

export type AppReleasePlatform = 'ios' | 'android';

/** `build_number` es lo único confiable para comparar actualizaciones — nunca comparar `version` como string simple (AGENTS.md sección 39). */
export interface AppRelease {
  platform: AppReleasePlatform;
  version: string;
  build_number: number;
  download_url: string;
  file_size?: number | null;
  sha256?: string | null;
  changelog?: string | null;
  minimum_required: boolean;
  published_at?: string | null;
}
