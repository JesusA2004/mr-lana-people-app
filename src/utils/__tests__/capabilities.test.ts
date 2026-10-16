import { canUseRhExperience, hasPermission, resolveDocumentCapabilities } from '../capabilities';

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

  it('las capacidades RH/manager se derivan del backend, NUNCA del nombre de rol', () => {
    // La función no recibe `roles`: solo capabilities (calculadas por Spatie en
    // el backend) + feature flag. Un "rh_admin" sin capability no entra; un
    // "colaborador" con capability sí. El rol es irrelevante por diseño.
    expect(canUseRhExperience({ ...baseCapabilities, rh: false, manager: false }, baseFeatures)).toBe(false);
    expect(canUseRhExperience({ ...baseCapabilities, rh: true }, baseFeatures)).toBe(true);
  });
});

describe('resolveDocumentCapabilities (contrato físico, defaults seguros)', () => {
  it('sin features (bootstrap aún sin cargar) aplica defaults del contrato', () => {
    const caps = resolveDocumentCapabilities(null);
    expect(caps).toEqual({ documentFlow: 2, finiquitoFirmaFisica: true, subidaEscaneoFirmado: false, recibos: false });
    expect(resolveDocumentCapabilities(undefined)).toEqual(caps);
  });

  it('respeta los valores explícitos que manda el backend', () => {
    const features = {
      document_flow: 2,
      finiquito_firma_fisica: true,
      subida_escaneo_firmado: false,
      recibos: true,
    } as unknown as MobileBootstrapFeatures;
    expect(resolveDocumentCapabilities(features)).toEqual({
      documentFlow: 2,
      finiquitoFirmaFisica: true,
      subidaEscaneoFirmado: false,
      recibos: true,
    });
  });

  it('subida_escaneo_firmado es fail-closed: solo true explícito habilita la subida', () => {
    expect(resolveDocumentCapabilities({ subida_escaneo_firmado: true } as never).subidaEscaneoFirmado).toBe(true);
    expect(resolveDocumentCapabilities({ subida_escaneo_firmado: false } as never).subidaEscaneoFirmado).toBe(false);
    expect(resolveDocumentCapabilities({} as never).subidaEscaneoFirmado).toBe(false);
  });

  it('finiquito_firma_fisica es fail-open: solo un false explícito lo apaga', () => {
    expect(resolveDocumentCapabilities({ finiquito_firma_fisica: false } as never).finiquitoFirmaFisica).toBe(false);
    expect(resolveDocumentCapabilities({} as never).finiquitoFirmaFisica).toBe(true);
  });

  it('document_flow tolera que el backend no lo mande (default 2)', () => {
    expect(resolveDocumentCapabilities({ document_flow: 2 } as never).documentFlow).toBe(2);
    expect(resolveDocumentCapabilities({} as never).documentFlow).toBe(2);
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
