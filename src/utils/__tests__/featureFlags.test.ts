import { isExperimentalFeatureEnabled, isFeatureEnabled, isOrganigramaEnabled } from '../featureFlags';

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

describe('isFeatureEnabled (módulos CORE, fail-open)', () => {
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

describe('isExperimentalFeatureEnabled (módulos nuevos, fail-closed)', () => {
  it('BUG DE PRODUCTO CORREGIDO: sin features todavía cargadas se asume DESHABILITADO, no habilitado', () => {
    expect(isExperimentalFeatureEnabled(null, 'formatos')).toBe(false);
    expect(isExperimentalFeatureEnabled(undefined, 'documentos_laborales')).toBe(false);
  });

  it('ausente en la respuesta del backend real (hoy no manda estas claves) se trata como deshabilitado', () => {
    expect(isExperimentalFeatureEnabled(baseFeatures, 'formatos')).toBe(false);
    expect(isExperimentalFeatureEnabled(baseFeatures, 'documentos_laborales')).toBe(false);
    expect(isExperimentalFeatureEnabled(baseFeatures, 'document_extraction')).toBe(false);
  });

  it('solo se habilita cuando el backend manda explícitamente true', () => {
    expect(isExperimentalFeatureEnabled({ ...baseFeatures, formatos: true }, 'formatos')).toBe(true);
  });

  it('un false explícito del backend también deshabilita, igual que su ausencia', () => {
    expect(isExperimentalFeatureEnabled({ ...baseFeatures, formatos: false }, 'formatos')).toBe(false);
  });
});

describe('isOrganigramaEnabled (caso especial: endpoint real ya existe)', () => {
  it('si el backend manda el flag explícito, ese valor manda siempre (incluso sobre el permiso)', () => {
    expect(isOrganigramaEnabled({ ...baseFeatures, organigrama: true }, [])).toBe(true);
    expect(isOrganigramaEnabled({ ...baseFeatures, organigrama: false }, ['puestos.administrar'])).toBe(false);
  });

  it('sin flag (backend real hoy no lo manda) cae en el permiso real que protege el endpoint', () => {
    expect(isOrganigramaEnabled(baseFeatures, ['puestos.administrar'])).toBe(true);
    expect(isOrganigramaEnabled(baseFeatures, ['otro.permiso'])).toBe(false);
    expect(isOrganigramaEnabled(baseFeatures, undefined)).toBe(false);
  });

  it('sin features cargadas todavía y sin permisos, no habilita por accidente', () => {
    expect(isOrganigramaEnabled(null, undefined)).toBe(false);
  });
});
