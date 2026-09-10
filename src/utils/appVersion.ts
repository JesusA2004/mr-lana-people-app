import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { AppRelease } from '@/types/appRelease';

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

/** Build/versionCode actual instalado — `nativeBuildVersion` refleja el build real del binario, más confiable que `app.json` en runtime. */
export function getCurrentBuildNumber(): number {
  const native = Constants.nativeBuildVersion;
  if (native) {
    const parsed = Number.parseInt(native, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }

  const expoConfig = Constants.expoConfig;
  if (Platform.OS === 'android') {
    const versionCode = expoConfig?.android?.versionCode;
    if (typeof versionCode === 'number') return versionCode;
  } else if (Platform.OS === 'ios') {
    const buildNumber = expoConfig?.ios?.buildNumber;
    if (buildNumber) {
      const parsed = Number.parseInt(buildNumber, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
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

export interface UpdateEvaluation {
  /** true si existe una versión más nueva publicada para esta plataforma. */
  updateAvailable: boolean;
  /** true si el usuario NO puede seguir usando la app sin actualizar. */
  mandatory: boolean;
}

/**
 * Decide si hay actualización disponible/obligatoria comparando SIEMPRE
 * `build_number` (entero, nunca ambiguo) — `version` solo se usa para
 * mostrarla al usuario, nunca para la decisión de bloqueo (AGENTS.md
 * sección 39/41). `configForceUpdate` es el interruptor global de
 * `app/config` (`force_update`), independiente de `minimum_required` por
 * release.
 */
export function evaluateUpdate(latest: AppRelease | null | undefined, configForceUpdate = false): UpdateEvaluation {
  if (!latest) return { updateAvailable: false, mandatory: false };

  const currentBuild = getCurrentBuildNumber();
  const isNewer = currentBuild > 0 && latest.build_number > currentBuild;

  return {
    updateAvailable: isNewer,
    mandatory: isNewer && (latest.minimum_required || configForceUpdate),
  };
}
