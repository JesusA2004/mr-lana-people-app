import { construirPermisos } from '../usePermisos';

import type { MobileBootstrap } from '@/types/mobileBootstrap';

function bootstrap(overrides: Partial<MobileBootstrap> & { permisos?: string[] } = {}): MobileBootstrap {
  const { permisos = [], ...resto } = overrides;
  return {
    user: { id: 1, name: 'Ana', email: 'a@b.mx', estatus: 'activo', foto_url: null, empresa: null, sucursal: null, departamento: null, puesto: null, roles: ['gerente'], permissions: permisos },
    capabilities: { employee: true, rh: true, manager: true, director: false },
    features: { incorporacion: true, expedientes: true, solicitudes: true, vacaciones: true, notificaciones: true, push: true, rh_mobile: true, maintenance: false },
    counts: { notifications: 0, tasks: 0, documents_pending: 0, rh_pendientes: 0, rh_solicitudes: 0, rh_vacaciones: 0, rh_documentos: 0, rh_incorporaciones: 0 },
    server: { time: '', timezone: 'America/Mexico_City' },
    ...resto,
  };
}

describe('usePermisos (fuente única de gating)', () => {
  it('sin bootstrap no ofrece nada operativo', () => {
    const p = construirPermisos(undefined);
    expect(p.cargado).toBe(false);
    expect(p.puede('rh.pendientes.ver')).toBe(false);
    expect(p.accion('aprobar_entrevista')).toBe(false);
    expect(p.operacionEnGestionRh).toBe(false);
  });

  it('decide por permiso exacto, nunca por el nombre del rol', () => {
    const p = construirPermisos(bootstrap({ permisos: ['candidatos.ver'] }));
    expect(p.puede('candidatos.ver')).toBe(true);
    // Rol «gerente» sin el permiso: no hay bandeja RH.
    expect(p.puede('rh.pendientes.ver')).toBe(false);
    expect(p.moduloRh('candidatos')).toBe(true);
    expect(p.moduloRh('actas')).toBe(false);
  });

  it('las banderas de acción salen de ciclo_laboral.acciones; ausente = no', () => {
    const p = construirPermisos(bootstrap({ ciclo_laboral: { acciones: { aprobar_entrevista: true, decidir_reingreso: false } } }));
    expect(p.accion('aprobar_entrevista')).toBe(true);
    expect(p.accion('decidir_reingreso')).toBe(false);
    expect(p.accion('autorizar_rh')).toBe(false);
  });

  it('con Gestión RH lo operativo vive allá; sin ella (o con rh_mobile apagado) se queda en Mi espacio', () => {
    expect(construirPermisos(bootstrap()).operacionEnGestionRh).toBe(true);
    const sinRh = bootstrap({ capabilities: { employee: true, rh: false, manager: true, director: false } });
    expect(construirPermisos(sinRh).operacionEnGestionRh).toBe(false);
    const apagado = bootstrap();
    apagado.features.rh_mobile = false;
    expect(construirPermisos(apagado).operacionEnGestionRh).toBe(false);
  });
});
