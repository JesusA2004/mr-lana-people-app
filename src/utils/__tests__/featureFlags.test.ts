import { isFeatureEnabled } from '../featureFlags';

import type { MobileBootstrapFeatures } from '@/types/mobileBootstrap';

const baseFeatures: MobileBootstrapFeatures = {
  incorporacion: true,
  expedientes: true,
  solicitudes: true,
  vacaciones: true,
  notificaciones: true,
  push: true,
  rh_mobile: true,
  maintenance: false,
  cumpleanos: true,
};

describe('isFeatureEnabled', () => {
  it('fail-open: sin features todavía cargadas (bootstrap en null/undefined) se asume habilitado', () => {
    expect(isFeatureEnabled(null, 'vacaciones')).toBe(true);
    expect(isFeatureEnabled(undefined, 'cumpleanos')).toBe(true);
  });

  it('respeta el valor explícito del backend cuando ya cargó', () => {
    expect(isFeatureEnabled(baseFeatures, 'vacaciones')).toBe(true);
    expect(isFeatureEnabled({ ...baseFeatures, vacaciones: false }, 'vacaciones')).toBe(false);
  });

  it('un feature ausente en la respuesta (undefined) no apaga la función por accidente', () => {
    const { cumpleanos: _cumpleanos, ...withoutCumpleanos } = baseFeatures;
    expect(isFeatureEnabled(withoutCumpleanos as MobileBootstrapFeatures, 'cumpleanos')).toBe(true);
  });
});
