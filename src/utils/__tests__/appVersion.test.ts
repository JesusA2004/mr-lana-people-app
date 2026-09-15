import {
  compareVersionStrings,
  evaluateUpdate,
  isBelowMinimumBuild,
  isBelowMinimumVersion,
  normalizeBuildNumber,
  resolveMinimumBuildForPlatform,
  resolveMinimumVersionForPlatform,
  resolveReleaseUrl,
} from '../appVersion';

import type { AppConfig, AppRelease } from '@/types/appRelease';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    nativeBuildVersion: '3',
    nativeApplicationVersion: '1.0.0',
    expoConfig: { version: '1.0.0', android: { versionCode: 3 }, ios: { buildNumber: '3' } },
  },
}));

describe('compareVersionStrings', () => {
  it('compara segmentos numéricos, no strings (1.10.0 > 1.9.0)', () => {
    expect(compareVersionStrings('1.10.0', '1.9.0')).toBe(1);
  });

  it('2.0.0 es mayor que 1.99.99 (nunca comparar como string)', () => {
    expect(compareVersionStrings('2.0.0', '1.99.99')).toBe(1);
  });

  it('detecta igualdad', () => {
    expect(compareVersionStrings('1.2.3', '1.2.3')).toBe(0);
  });

  it('detecta versión menor', () => {
    expect(compareVersionStrings('1.2.0', '1.2.3')).toBe(-1);
  });

  it('tolera longitudes distintas de segmentos', () => {
    expect(compareVersionStrings('1.2', '1.2.0.1')).toBe(-1);
  });
});

describe('normalizeBuildNumber', () => {
  it('acepta un number válido', () => {
    expect(normalizeBuildNumber(10)).toBe(10);
  });

  it('acepta una string numérica ("10" > 9 como entero, no como string)', () => {
    expect(normalizeBuildNumber('10')).toBe(10);
    expect(normalizeBuildNumber('10')! > normalizeBuildNumber('9')!).toBe(true);
  });

  it('normaliza null/undefined a null (nunca bloquea por accidente)', () => {
    expect(normalizeBuildNumber(null)).toBeNull();
    expect(normalizeBuildNumber(undefined)).toBeNull();
  });

  it('normaliza un build inválido (string no numérica, decimal, negativo) a null', () => {
    expect(normalizeBuildNumber('abc')).toBeNull();
    expect(normalizeBuildNumber('10.5')).toBeNull();
    expect(normalizeBuildNumber(-1)).toBeNull();
    expect(normalizeBuildNumber(Number.NaN)).toBeNull();
  });
});

describe('isBelowMinimumVersion', () => {
  it('sin mínimo configurado nunca bloquea', () => {
    expect(isBelowMinimumVersion('1.0.0', null)).toBe(false);
  });

  it('versión instalada menor a la mínima', () => {
    expect(isBelowMinimumVersion('1.0.0', '1.2.0')).toBe(true);
  });

  it('versión instalada igual o mayor a la mínima', () => {
    expect(isBelowMinimumVersion('1.2.0', '1.2.0')).toBe(false);
    expect(isBelowMinimumVersion('2.0.0', '1.2.0')).toBe(false);
  });
});

describe('isBelowMinimumBuild', () => {
  it('mínimo null nunca bloquea', () => {
    expect(isBelowMinimumBuild(3, null)).toBe(false);
  });

  it('build instalado por debajo del mínimo sí bloquea', () => {
    expect(isBelowMinimumBuild(3, 5)).toBe(true);
  });

  it('build instalado igual o mayor al mínimo no bloquea', () => {
    expect(isBelowMinimumBuild(5, 5)).toBe(false);
    expect(isBelowMinimumBuild(6, 5)).toBe(false);
  });
});

describe('resolveMinimumVersionForPlatform / resolveMinimumBuildForPlatform', () => {
  it('sin config no hay mínimo', () => {
    expect(resolveMinimumVersionForPlatform(null)).toBeNull();
    expect(resolveMinimumBuildForPlatform(null)).toBeNull();
  });

  it('usa minimum_version como fallback si el específico de plataforma no viene (backwards compatibility)', () => {
    const config: AppConfig = {
      maintenance: false,
      minimum_version: '1.5.0',
      latest_version: null,
      force_update: false,
      features: null,
    };
    expect(resolveMinimumVersionForPlatform(config)).toBe('1.5.0');
  });

  it('prioriza el mínimo específico de plataforma sobre minimum_version cuando el backend ya lo manda', () => {
    // Mismo valor en ambas plataformas para que la aserción no dependa de
    // qué `Platform.OS` use el entorno de test (jest-expo no fija uno solo).
    const config: AppConfig = {
      maintenance: false,
      minimum_version: '1.0.0',
      minimum_android_version: '2.0.0',
      minimum_android_build: '12',
      minimum_ios_version: '2.0.0',
      minimum_ios_build: '12',
      latest_version: null,
      force_update: false,
      features: null,
    };
    expect(resolveMinimumVersionForPlatform(config)).toBe('2.0.0');
    expect(resolveMinimumBuildForPlatform(config)).toBe(12);
  });

  it('un minimum_*_build inválido no bloquea (normaliza a null)', () => {
    const config: AppConfig = {
      maintenance: false,
      minimum_version: null,
      minimum_android_build: 'no-es-un-numero',
      latest_version: null,
      force_update: false,
      features: null,
    };
    expect(resolveMinimumBuildForPlatform(config)).toBeNull();
  });
});

describe('evaluateUpdate', () => {
  const baseRelease: AppRelease = {
    platform: 'android',
    version: '1.1.0',
    build_number: 5,
    download_url: 'https://people.mr-lana.com/app/descargar/android',
    minimum_required: false,
  };

  it('sin release publicada no hay actualización', () => {
    expect(evaluateUpdate(null)).toEqual({ updateAvailable: false, mandatory: false });
  });

  it('build más nueva disponible pero opcional', () => {
    expect(evaluateUpdate(baseRelease)).toEqual({ updateAvailable: true, mandatory: false });
  });

  it('build más nueva y minimum_required=true es obligatoria', () => {
    expect(evaluateUpdate({ ...baseRelease, minimum_required: true })).toEqual({ updateAvailable: true, mandatory: true });
  });

  it('force_update global vuelve obligatoria una actualización disponible', () => {
    expect(evaluateUpdate(baseRelease, true)).toEqual({ updateAvailable: true, mandatory: true });
  });

  it('misma build instalada no ofrece actualización', () => {
    expect(evaluateUpdate({ ...baseRelease, build_number: 3 })).toEqual({ updateAvailable: false, mandatory: false });
  });

  it('build publicada anterior a la instalada no ofrece actualización', () => {
    expect(evaluateUpdate({ ...baseRelease, build_number: 1 })).toEqual({ updateAvailable: false, mandatory: false });
  });

  it('build_number como string numérica se normaliza y compara como entero', () => {
    expect(evaluateUpdate({ ...baseRelease, build_number: '10' })).toEqual({ updateAvailable: true, mandatory: false });
  });

  it('build_number null en la release no bloquea (se trata como sin actualización)', () => {
    expect(evaluateUpdate({ ...baseRelease, build_number: null })).toEqual({ updateAvailable: false, mandatory: false });
  });

  it('build_number inválido (no numérico) no bloquea', () => {
    expect(evaluateUpdate({ ...baseRelease, build_number: 'no-es-un-numero' })).toEqual({ updateAvailable: false, mandatory: false });
  });
});

describe('resolveReleaseUrl', () => {
  const base = { platform: 'android' as const, version: '1.2.0', build_number: 12, minimum_required: false };

  it('Android usa el APK directo', () => {
    expect(resolveReleaseUrl({ ...base, download_url: 'https://people.mr-lana.com/app/descargar/android' })).toBe(
      'https://people.mr-lana.com/app/descargar/android',
    );
  });

  it('iOS cae en install_url cuando no hay archivo que descargar', () => {
    expect(
      resolveReleaseUrl({ ...base, platform: 'ios', download_url: null, install_url: 'https://testflight.apple.com/join/abc' }),
    ).toBe('https://testflight.apple.com/join/abc');
  });

  it('iOS cae en store_url si tampoco hay install_url', () => {
    expect(
      resolveReleaseUrl({ ...base, platform: 'ios', download_url: null, install_url: null, store_url: 'https://apps.apple.com/app/id123' }),
    ).toBe('https://apps.apple.com/app/id123');
  });

  it('sin ninguna URL devuelve null — quien llama NO debe bloquear la app', () => {
    expect(resolveReleaseUrl({ ...base, platform: 'ios', download_url: null })).toBeNull();
    expect(resolveReleaseUrl(null)).toBeNull();
    expect(resolveReleaseUrl(undefined)).toBeNull();
  });
});
