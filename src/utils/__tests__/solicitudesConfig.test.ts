import { configuracionResponse, bootstrapGerente, bootstrapResponse } from '../../test/fixtures/backend';
import {
  buildCreatePayload,
  findTipoConfig,
  normalizeSolicitudesConfiguracion,
  visibleRequestTypes,
} from '../solicitudesConfig';

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

  it('completa fecha_efectiva y tipo_baja para la baja, que el backend no emite (gap D-2)', () => {
    const tipos = normalizeSolicitudesConfiguracion(configuracionResponse);
    const baja = findTipoConfig(tipos, 'baja_colaborador');

    expect(baja?.campos.map((campo) => campo.name)).toEqual([
      'motivo',
      'observaciones',
      'colaborador_objetivo_id',
      'fecha_efectiva',
      'tipo_baja',
    ]);
  });

  it('no duplica esos campos si el backend empieza a mandarlos', () => {
    const [baja] = normalizeSolicitudesConfiguracion({
      tipos: [
        {
          clave: 'baja_colaborador',
          nombre: 'Baja de colaborador',
          requiere_colaborador_objetivo: true,
          campos: [
            { name: 'colaborador_objetivo_id', type: 'select', required: true },
            { name: 'fecha_efectiva', type: 'date', required: true },
            { name: 'tipo_baja', type: 'select', required: true },
          ],
        },
      ],
    });

    expect(baja.campos.filter((campo) => campo.name === 'tipo_baja')).toHaveLength(1);
  });
});

describe('visibleRequestTypes', () => {
  it('oculta baja_colaborador a un colaborador sin solicitudes.bajas.crear', () => {
    const tipos = normalizeSolicitudesConfiguracion(configuracionResponse);
    const visibles = visibleRequestTypes(tipos, bootstrapResponse.user.permissions);

    expect(visibles.map((tipo) => tipo.clave)).not.toContain('baja_colaborador');
    expect(visibles).toHaveLength(4);
  });

  it('la muestra a quien sí tiene el permiso', () => {
    const tipos = normalizeSolicitudesConfiguracion(configuracionResponse);
    const visibles = visibleRequestTypes(tipos, bootstrapGerente.user.permissions);

    expect(visibles.map((tipo) => tipo.clave)).toContain('baja_colaborador');
  });

  it('sin permisos cargados todavía, tampoco la muestra (fail-closed)', () => {
    const tipos = normalizeSolicitudesConfiguracion(configuracionResponse);

    expect(visibleRequestTypes(tipos, undefined).map((tipo) => tipo.clave)).not.toContain('baja_colaborador');
    expect(visibleRequestTypes(undefined, undefined)).toEqual([]);
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

  it('manda el monto del préstamo como número limpio, no como texto con formato', () => {
    const config = findTipoConfig(tipos, 'prestamo')!;
    const payload = buildCreatePayload(config, { motivo: 'Gastos médicos', monto_solicitado: '$1,500.50', plazo_meses: '12' });

    expect(payload.monto_solicitado).toBe(1500.5);
    expect(payload.plazo_meses).toBe(12);
  });

  it('omite los campos opcionales vacíos en vez de mandar cadenas vacías', () => {
    const config = findTipoConfig(tipos, 'vacaciones')!;
    const payload = buildCreatePayload(config, { motivo: 'x', fecha_inicio: '2026-10-05', fecha_fin: '2026-10-09', observaciones: '   ' });

    expect(payload).not.toHaveProperty('observaciones');
  });

  it('para la baja incluye colaborador_objetivo_id numérico, fecha_efectiva y tipo_baja', () => {
    const config = findTipoConfig(tipos, 'baja_colaborador')!;
    const payload = buildCreatePayload(config, {
      motivo: 'Renuncia voluntaria',
      colaborador_objetivo_id: 42,
      fecha_efectiva: '2026-10-31',
      tipo_baja: 'renuncia',
    });

    expect(payload).toEqual({
      tipo: 'baja_colaborador',
      motivo: 'Renuncia voluntaria',
      colaborador_objetivo_id: 42,
      fecha_efectiva: '2026-10-31',
      tipo_baja: 'renuncia',
    });
  });
});
