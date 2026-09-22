import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { AppConfig, AppRelease, RawBuildNumber } from '@/types/appRelease';

/**
 * Comparación de versiones (AGENTS.md sección 39: "NO comparar versiones
 * como strings simples"). `"1.10.0" > "1.9.0"` con comparación de string
 * sería falso (`"1.10.0" < "1.9.0"` lexicográficamente) — aquí se comparan
 * segmento a segmento como enteros.
 */
export function compareVersionStrings(a: string, b: string): number {
  const partsA = a.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const partsB = b.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * Normaliza un `build_number`/`minimum_*_build` que puede llegar del
 * backend como `number`, string numérica (`"10"`) o `null`/`undefined`
 * (AGENTS.md sección 39: "NO confiar en que build_number siempre llegue
 * como number"). Cualquier forma inválida (string no numérica, decimal,
 * negativo, `NaN`) se normaliza a `null` — un build inválido NUNCA debe
 * forzar una actualización por accidente, lo trata como "sin dato".
 */
export function normalizeBuildNumber(raw: RawBuildNumber): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? Math.trunc(raw) : null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

/** Build/versionCode actual instalado — `nativeBuildVersion` refleja el build real del binario, más confiable que `app.json` en runtime. */
export function getCurrentBuildNumber(): number {
  const native = normalizeBuildNumber(Constants.nativeBuildVersion);
  if (native !== null) return native;

  const expoConfig = Constants.expoConfig;
  if (Platform.OS === 'android') {
    const versionCode = normalizeBuildNumber(expoConfig?.android?.versionCode);
    if (versionCode !== null) return versionCode;
  } else if (Platform.OS === 'ios') {
    const buildNumber = normalizeBuildNumber(expoConfig?.ios?.buildNumber);
    if (buildNumber !== null) return buildNumber;
  }
  return 0;
}

export function getCurrentAppVersion(): string {
  return Constants.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0';
}

/** true si `current` es estrictamente menor que `minimum` (AGENTS.md sección 40: `app/config.minimum_version`). */
export function isBelowMinimumVersion(current: string, minimum: string | null | undefined): boolean {
  if (!minimum) return false;
  return compareVersionStrings(current, minimum) < 0;
}

/** Análogo a `isBelowMinimumVersion` pero comparando build numbers ya normalizados — nunca versión como string. */
export function isBelowMinimumBuild(current: number, minimum: number | null): boolean {
  if (minimum === null) return false;
  return current > 0 && current < minimum;
}

/**
 * Versión mínima aplicable a la plataforma actual: prioriza
 * `minimum_{android,ios}_version` (contrato final del backend, AGENTS.md
 * sección 39) y cae en `minimum_version` si el backend todavía no manda el
 * campo específico — backwards compatibility explícita.
 */
export function resolveMinimumVersionForPlatform(config: AppConfig | null | undefined): string | null {
  if (!config) return null;
  const specific = Platform.OS === 'ios' ? config.minimum_ios_version : config.minimum_android_version;
  return specific ?? config.minimum_version ?? null;
}

/** Build mínimo aplicable a la plataforma actual (`minimum_android_build`/`minimum_ios_build`), ya normalizado. */
export function resolveMinimumBuildForPlatform(config: AppConfig | null | undefined): number | null {
  if (!config) return null;
  const raw = Platform.OS === 'ios' ? config.minimum_ios_build : config.minimum_android_build;
  return normalizeBuildNumber(raw);
}

export interface UpdateEvaluation {
  /** true si existe una versión más nueva publicada para esta plataforma. */
  updateAvailable: boolean;
  /** true si el usuario NO puede seguir usando la app sin actualizar. */
  mandatory: boolean;
}

/**
 * Decide si hay actualización disponible/obligatoria comparando SIEMPRE
 * `build_number` (entero normalizado, nunca ambiguo) — `version` solo se
 * usa para mostrarla al usuario, nunca para la decisión de bloqueo
 * (AGENTS.md sección 39/41). `configForceUpdate` es el interruptor global
 * de `app/config` (`force_update`), independiente de `minimum_required` por
 * release. Un `build_number` inválido/faltante en la release NUNCA bloquea
 * por accidente — se trata como "sin actualización publicada".
 */
export function evaluateUpdate(latest: AppRelease | null | undefined, configForceUpdate = false): UpdateEvaluation {
  if (!latest) return { updateAvailable: false, mandatory: false };

  const latestBuild = normalizeBuildNumber(latest.build_number);
  if (latestBuild === null) return { updateAvailable: false, mandatory: false };

  const currentBuild = getCurrentBuildNumber();
  const isNewer = currentBuild > 0 && latestBuild > currentBuild;

  return {
    updateAvailable: isNewer,
    mandatory: isNewer && (latest.minimum_required || configForceUpdate),
  };
}

/**
 * A dónde mandar al usuario para actualizar. Android baja el APK directo
 * (`download_url`); iOS todavía no tiene archivo propio, así que el backend
 * manda `install_url` (TestFlight/ad-hoc) o `store_url` cuando existan.
 *
 * `download_url` puede llegar `null` — `AppReleaseController::paraApi` solo
 * la llena si el release tiene archivo. Devolver `null` aquí significa "no
 * hay a dónde ir": quien llama NO debe bloquear la app con una pantalla de
 * actualización sin salida (ver `ForceUpdateScreen`).
 */
export function resolveReleaseUrl(release: AppRelease | null | undefined): string | null {
  if (!release) return null;
  return release.download_url || release.install_url || release.store_url || null;
}

/** "1.0.0 (12)" — versión legible con build, para Configuración y soporte. */
export function formatVersionLabel(version: string, build: number): string {
  return build > 0 ? `${version} (${build})` : version;
}

export function getCurrentVersionLabel(): string {
  return formatVersionLabel(getCurrentAppVersion(), getCurrentBuildNumber());
}
