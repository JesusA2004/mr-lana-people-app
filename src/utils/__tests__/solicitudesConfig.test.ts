import { configuracionResponse } from '../../test/fixtures/backend';
import { buildCreatePayload, creatableRequestTypes, findTipoConfig, normalizeSolicitudesConfiguracion } from '../solicitudesConfig';

describe('normalizeSolicitudesConfiguracion', () => {
  it('lee la envoltura REAL del backend: { tipos: [...] }, nunca { data: [...] }', () => {
    const tipos = normalizeSolicitudesConfiguracion(configuracionResponse);

    expect(tipos).toHaveLength(configuracionResponse.tipos.length);
    expect(tipos.map((tipo) => tipo.clave)).toEqual([
      'vacaciones',
      'permiso_tiempo',
      'prestamo',
      'baja_colaborador',
      'solicitud_general',
    ]);
  });

  it('nunca devuelve un catálogo vacío por pasar la respuesta cruda (bug B-1)', () => {
    // `extractData()` sobre `{tipos: [...]}` devolvía el objeto completo y el
    // wizard se quedaba sin tipos. El normalizador debe rescatar el arreglo.
    expect(normalizeSolicitudesConfiguracion(configuracionResponse).length).toBeGreaterThan(0);
  });

  it('usa las claves exactas del enum: prestamo y solicitud_general, no prestamo_interno ni general', () => {
    const claves = normalizeSolicitudesConfiguracion(configuracionResponse).map((tipo) => tipo.clave);

    expect(claves).toContain('prestamo');
    expect(claves).toContain('solicitud_general');
    expect(claves).not.toContain('prestamo_interno');
    expect(claves).not.toContain('general');
  });

  it('tolera envolturas alternas y basura sin lanzar', () => {
    expect(normalizeSolicitudesConfiguracion({ data: configuracionResponse.tipos })).toHaveLength(5);
    expect(normalizeSolicitudesConfiguracion(configuracionResponse.tipos)).toHaveLength(5);
    expect(normalizeSolicitudesConfiguracion({ data: configuracionResponse })).toHaveLength(5);
    expect(normalizeSolicitudesConfiguracion(null)).toEqual([]);
    expect(normalizeSolicitudesConfiguracion({})).toEqual([]);
    expect(normalizeSolicitudesConfiguracion({ tipos: 'nope' })).toEqual([]);
  });

  it('descarta entradas sin clave y campos sin nombre en vez de romper la lista', () => {
    const tipos = normalizeSolicitudesConfiguracion({
      tipos: [
        { nombre: 'Sin clave' },
        { clave: 'ok', nombre: 'Ok', campos: [{ type: 'text', required: true }, { name: 'motivo', type: 'text', required: true }] },
      ],
    });

    expect(tipos).toHaveLength(1);
    expect(tipos[0].campos).toEqual([{ name: 'motivo', type: 'text', required: true }]);
  });

  it('degrada un `type` desconocido a texto para no perder el campo', () => {
    const [tipo] = normalizeSolicitudesConfiguracion({
      tipos: [{ clave: 'futuro', nombre: 'Futuro', campos: [{ name: 'firma', type: 'signature', required: true }] }],
    });

    expect(tipo.campos[0]).toEqual({ name: 'firma', type: 'text', required: true });
  });

  it('descarta campos que el colaborador nunca captura aunque un backend anterior los anuncie', () => {
    const tipos = normalizeSolicitudesConfiguracion(configuracionResponse);
    const prestamo = findTipoConfig(tipos, 'prestamo');
    const baja = findTipoConfig(tipos, 'baja_colaborador');

    expect(prestamo?.campos.map((campo) => campo.name)).not.toContain('plazo_meses');
    expect(baja?.campos.map((campo) => campo.name)).not.toContain('colaborador_objetivo_id');
  });
});

describe('creatableRequestTypes — un colaborador NO solicita bajas', () => {
  it('nunca ofrece baja_colaborador, sin importar permisos', () => {
    const tipos = normalizeSolicitudesConfiguracion(configuracionResponse);
    const claves = creatableRequestTypes(tipos).map((tipo) => tipo.clave);

    expect(claves).not.toContain('baja_colaborador');
    expect(claves).toEqual(['vacaciones', 'permiso_tiempo', 'prestamo', 'solicitud_general']);
  });

  it('tampoco ofrece un tipo nuevo que pida colaborador objetivo (baja con otro nombre)', () => {
    const tipos = normalizeSolicitudesConfiguracion({
      tipos: [
        { clave: 'terminacion_laboral', nombre: 'Terminación laboral', requiere_colaborador_objetivo: true, campos: [] },
        { clave: 'solicitud_general', nombre: 'General', campos: [] },
      ],
    });

    expect(creatableRequestTypes(tipos).map((tipo) => tipo.clave)).toEqual(['solicitud_general']);
  });

  it('sin catálogo devuelve lista vacía', () => {
    expect(creatableRequestTypes(undefined)).toEqual([]);
  });
});

describe('buildCreatePayload', () => {
  const tipos = normalizeSolicitudesConfiguracion(configuracionResponse);

  it('arma vacaciones con los campos que StoreSolicitudInternaRequest exige', () => {
    const config = findTipoConfig(tipos, 'vacaciones')!;

    expect(
      buildCreatePayload(config, {
        fecha_inicio: '2026-10-05',
        fecha_fin: '2026-10-09',
        motivo: '  Descanso familiar  ',
        dias_solicitados: 5,
      }),
    ).toEqual({
      tipo: 'vacaciones',
      motivo: 'Descanso familiar',
      fecha_inicio: '2026-10-05',
      fecha_fin: '2026-10-09',
      dias_solicitados: 5,
    });
  });

  it('nunca manda claves que el tipo no pide', () => {
    const config = findTipoConfig(tipos, 'solicitud_general')!;
    const payload = buildCreatePayload(config, {
      motivo: 'Necesito ayuda',
      // Restos de otro tipo: no deben viajar.
      fecha_inicio: '2026-10-05',
      monto_solicitado: 500,
    });

    expect(payload).toEqual({ tipo: 'solicitud_general', motivo: 'Necesito ayuda' });
  });

  it('préstamo: solo monto (número limpio) y motivo — nunca plazo', () => {
    const config = findTipoConfig(tipos, 'prestamo')!;
    const payload = buildCreatePayload(config, { motivo: 'Gastos médicos', monto_solicitado: '$1,500.50', plazo_meses: '12' });

    expect(payload).toEqual({ tipo: 'prestamo', motivo: 'Gastos médicos', monto_solicitado: 1500.5 });
  });

  it('omite los campos opcionales vacíos en vez de mandar cadenas vacías', () => {
    const config = findTipoConfig(tipos, 'vacaciones')!;
    const payload = buildCreatePayload(config, { motivo: 'x', fecha_inicio: '2026-10-05', fecha_fin: '2026-10-09', observaciones: '   ' });

    expect(payload).not.toHaveProperty('observaciones');
  });

  it('la baja no se puede armar desde el autoservicio', () => {
    const config = findTipoConfig(tipos, 'baja_colaborador')!;

    expect(() => buildCreatePayload(config, { motivo: 'Renuncia' })).toThrow();
  });
});
