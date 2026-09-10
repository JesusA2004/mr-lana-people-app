import { canUseRhExperience, hasPermission } from '../capabilities';

import type { MobileBootstrapCapabilities, MobileBootstrapFeatures } from '@/types/mobileBootstrap';

const baseCapabilities: MobileBootstrapCapabilities = { employee: true, rh: false, manager: false, director: false };
const baseFeatures: MobileBootstrapFeatures = {
  incorporacion: true,
  expedientes: true,
  solicitudes: true,
  vacaciones: true,
  notificaciones: true,
  push: true,
  rh_mobile: true,
  maintenance: false,
};

describe('canUseRhExperience', () => {
  it('false si el usuario no tiene el permiso RH', () => {
    expect(canUseRhExperience(baseCapabilities, baseFeatures)).toBe(false);
  });

  it('true si tiene el permiso Y el feature flag está encendido', () => {
    expect(canUseRhExperience({ ...baseCapabilities, rh: true }, baseFeatures)).toBe(true);
  });

  it('false si tiene el permiso pero RH apagó el feature flag remoto', () => {
    expect(canUseRhExperience({ ...baseCapabilities, rh: true }, { ...baseFeatures, rh_mobile: false })).toBe(false);
  });
});

describe('hasPermission', () => {
  it('true solo si el permiso exacto está en la lista de Spatie', () => {
    expect(hasPermission(['rh.expedientes.ver', 'rh.expedientes.documentos.aprobar'], 'rh.expedientes.documentos.aprobar')).toBe(true);
    expect(hasPermission(['rh.expedientes.ver'], 'rh.expedientes.documentos.aprobar')).toBe(false);
  });

  it('tolera undefined sin lanzar (rh_auxiliar sin aprobar)', () => {
    expect(hasPermission(undefined, 'rh.expedientes.documentos.aprobar')).toBe(false);
  });
});
