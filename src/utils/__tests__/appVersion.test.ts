import { compareVersionStrings, evaluateUpdate, isBelowMinimumVersion } from '../appVersion';

import type { AppRelease } from '@/types/appRelease';

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
});
