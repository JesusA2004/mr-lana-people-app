import { configuracionResponse } from '../../test/fixtures/backend';
import { buildCreatePayload, campoVisible, creatableRequestTypes, findTipoConfig, normalizeSolicitudesConfiguracion } from '../solicitudesConfig';

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

describe('fechas por tipo (backend: FechasSolicitudService)', () => {
  const catalogo = {
    tipos: [
      {
        clave: 'incapacidad',
        nombre: 'Incapacidad',
        modo_fechas: 'duracion',
        requiere_fechas: true,
        campos: [
          { name: 'fecha_inicio', type: 'date', required: true, label: 'Fecha de inicio' },
          { name: 'duracion_dias', type: 'number', required: true, min: 1, max: 365, ayuda: 'Días naturales' },
          { name: 'motivo', type: 'text', required: true },
        ],
      },
      {
        clave: 'vacaciones',
        nombre: 'Vacaciones',
        modo_fechas: 'dias_especificos',
        dias_no_seleccionables: [0],
        requiere_fechas: true,
        requiere_dias: true,
        campos: [
          { name: 'dias', type: 'dates', required: true, max: 60 },
          { name: 'motivo', type: 'text', required: true },
        ],
      },
    ],
  };

  it('incapacidad manda inicio + número de días, nunca fecha_fin', () => {
    const tipos = normalizeSolicitudesConfiguracion(catalogo);
    const config = findTipoConfig(tipos, 'incapacidad')!;

    expect(config.modo_fechas).toBe('duracion');
    expect(config.campos[1]).toMatchObject({ name: 'duracion_dias', min: 1, max: 365, ayuda: 'Días naturales' });
    expect(buildCreatePayload(config, { motivo: 'IMSS', fecha_inicio: '2026-10-14', duracion_dias: '5', fecha_fin: '2026-12-31' })).toEqual({
      tipo: 'incapacidad',
      motivo: 'IMSS',
      fecha_inicio: '2026-10-14',
      duracion_dias: 5,
    });
  });

  it('vacaciones manda la lista de días ordenada y sin repetidos', () => {
    const tipos = normalizeSolicitudesConfiguracion(catalogo);
    const config = findTipoConfig(tipos, 'vacaciones')!;

    expect(config.modo_fechas).toBe('dias_especificos');
    expect(config.dias_no_seleccionables).toEqual([0]);
    expect(config.campos[0].type).toBe('dates');
    expect(
      buildCreatePayload(config, { motivo: 'Viaje', dias: ['2026-10-17', '2026-10-12', '2026-10-13', '2026-10-12', '2026-10-14', '2026-10-16'] }),
    ).toEqual({ tipo: 'vacaciones', motivo: 'Viaje', dias: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-16', '2026-10-17'] });
  });

  it('un backend anterior sin modo_fechas se deduce de sus banderas', () => {
    const tipos = normalizeSolicitudesConfiguracion({ tipos: [{ clave: 'permiso_tiempo', nombre: 'Permiso', requiere_horario: true, campos: [] }] });

    expect(tipos[0].modo_fechas).toBe('horario');
  });
});

describe('permiso oficial (modalidad, goce y causal)', () => {
  // Forma REAL de `SolicitudesService::camposPermiso()`.
  const permiso = normalizeSolicitudesConfiguracion({
    tipos: [
      {
        clave: 'permiso',
        nombre: 'Permiso',
        modo_fechas: 'duracion',
        campos: [
          { name: 'permiso_tipo', type: 'opciones', required: true, label: 'Permiso solicitado', opciones: [{ value: 'faltar', label: 'Permiso para faltar' }, { value: 'salir_temprano', label: 'Permiso para salir temprano' }, { value: 'llegar_tarde', label: 'Permiso para llegar tarde' }] },
          { name: 'fecha_inicio', type: 'date', required: true, label: 'Fecha del permiso' },
          { name: 'duracion_dias', type: 'number', required: true, mostrar_si: { campo: 'permiso_tipo', valores: ['faltar'] } },
          { name: 'hora_salida', type: 'time', required: true, mostrar_si: { campo: 'permiso_tipo', valores: ['salir_temprano'] } },
          { name: 'hora_entrada', type: 'time', required: true, mostrar_si: { campo: 'permiso_tipo', valores: ['llegar_tarde'] } },
          { name: 'permiso_goce', type: 'opciones', required: true, opciones: [{ value: 'con_goce', label: 'Con goce de sueldo' }, { value: 'sin_goce', label: 'Sin goce de sueldo' }, { value: 'especial', label: 'Permiso especial' }] },
          { name: 'permiso_causal', type: 'opciones', required: true, opciones: [{ value: 'cumpleanos', label: 'Cumpleaños' }], mostrar_si: { campo: 'permiso_goce', valores: ['especial'] } },
          { name: 'observaciones', type: 'text', required: false },
        ],
      },
    ],
  })[0];

  it('conserva las opciones, la hora y las condiciones que manda el backend', () => {
    const tipoCampo = permiso.campos.find((c) => c.name === 'permiso_tipo');
    expect(tipoCampo?.type).toBe('opciones');
    expect(tipoCampo?.opciones).toHaveLength(3);
    expect(permiso.campos.find((c) => c.name === 'hora_salida')?.type).toBe('time');
    expect(permiso.campos.find((c) => c.name === 'permiso_causal')?.mostrar_si).toEqual({ campo: 'permiso_goce', valores: ['especial'] });
  });

  it('salir temprano con goce: manda la hora de salida y NUNCA días, hora de entrada ni causal', () => {
    const values = { permiso_tipo: 'salir_temprano', fecha_inicio: '2026-10-20', duracion_dias: 3, hora_salida: '15:00', hora_entrada: '10:00', permiso_goce: 'con_goce', permiso_causal: 'cumpleanos' };

    expect(permiso.campos.filter((c) => campoVisible(c, values)).map((c) => c.name)).not.toContain('permiso_causal');
    expect(buildCreatePayload(permiso, values)).toEqual({ tipo: 'permiso', motivo: '', permiso_tipo: 'salir_temprano', fecha_inicio: '2026-10-20', hora_salida: '15:00', permiso_goce: 'con_goce' });
  });

  it('faltar con permiso especial: manda días y causal', () => {
    const payload = buildCreatePayload(permiso, { permiso_tipo: 'faltar', fecha_inicio: '2026-10-20', duracion_dias: 1, permiso_goce: 'especial', permiso_causal: 'cumpleanos' });

    expect(payload).toMatchObject({ permiso_tipo: 'faltar', duracion_dias: 1, permiso_goce: 'especial', permiso_causal: 'cumpleanos' });
    expect(payload).not.toHaveProperty('hora_salida');
  });
});
