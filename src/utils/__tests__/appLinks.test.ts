import { experienceForPushType, resolveResourceRoute } from '../appLinks';

describe('resolveResourceRoute — colaborador', () => {
  it('solicitud con id navega al detalle', () => {
    expect(resolveResourceRoute({ type: 'solicitud', resource_id: 123 })).toBe('/solicitud/123');
  });

  it('documento sin id cae al tab de expediente', () => {
    expect(resolveResourceRoute({ type: 'documento' })).toBe('/(app)/(tabs)/expediente');
  });

  it('cumpleanos navega a la celebración', () => {
    expect(resolveResourceRoute({ type: 'cumpleanos' })).toBe('/cumpleanos');
  });

  it('documento_laboral con id navega al detalle', () => {
    expect(resolveResourceRoute({ type: 'documento_laboral', resource_id: 300 })).toBe('/documentos-laborales/300');
  });

  it('documento_laboral sin id cae en la lista', () => {
    expect(resolveResourceRoute({ type: 'documento_laboral' })).toBe('/documentos-laborales');
  });

  it('tipo desconocido no navega a ningún lado', () => {
    expect(resolveResourceRoute({ type: 'algo_nuevo' })).toBeNull();
  });
});

describe('resolveResourceRoute — RH', () => {
  it('rh_solicitud con id navega al detalle RH', () => {
    expect(resolveResourceRoute({ type: 'rh_solicitud', resource_id: 184 })).toBe('/(app)/rh/solicitudes/184');
  });

  it('rh_pendiente siempre cae en la bandeja', () => {
    expect(resolveResourceRoute({ type: 'rh_pendiente' })).toBe('/(app)/rh/(tabs)/pendientes');
  });

  it('rh_cumpleanos con resource_id navega al detalle de la felicitación', () => {
    expect(resolveResourceRoute({ type: 'rh_cumpleanos', resource_id: 42 })).toBe('/(app)/rh/cumpleanos/42');
  });

  it('rh_cumpleanos sin resource_id pero con periodo navega a la bandeja filtrada (excepción documentada: nunca inventar un id)', () => {
    expect(resolveResourceRoute({ type: 'rh_cumpleanos', resource_id: null, periodo: 'hoy' })).toBe('/(app)/rh/cumpleanos?periodo=hoy');
  });

  it('rh_cumpleanos sin resource_id ni periodo cae en la bandeja general', () => {
    expect(resolveResourceRoute({ type: 'rh_cumpleanos' })).toBe('/(app)/rh/cumpleanos');
  });

  it('rh_documento sin reason abre el detalle normal', () => {
    expect(resolveResourceRoute({ type: 'rh_documento', resource_id: 431 })).toBe('/(app)/rh/documentos/431');
  });

  it('rh_documento con reason=extraction_review abre directo en Análisis automático', () => {
    expect(resolveResourceRoute({ type: 'rh_documento', resource_id: 431, reason: 'extraction_review' })).toBe(
      '/(app)/rh/documentos/431?focus=extraccion',
    );
  });

  it('rh_documento con un reason desconocido se ignora y abre el detalle normal', () => {
    expect(resolveResourceRoute({ type: 'rh_documento', resource_id: 431, reason: 'algo_que_no_conocemos' })).toBe(
      '/(app)/rh/documentos/431',
    );
  });

  it('rh_extraccion_documento siempre abre directo en Análisis automático', () => {
    expect(resolveResourceRoute({ type: 'rh_extraccion_documento', resource_id: 431 })).toBe('/(app)/rh/documentos/431?focus=extraccion');
  });

  it('formato_disponible cae en la lista de formatos', () => {
    expect(resolveResourceRoute({ type: 'formato_disponible', resource_id: 155 })).toBe('/(app)/rh/formatos');
  });
});

describe('experienceForPushType', () => {
  it('tipos rh_* pertenecen a la experiencia RH', () => {
    expect(experienceForPushType('rh_solicitud')).toBe('rh');
    expect(experienceForPushType('rh_cumpleanos')).toBe('rh');
    expect(experienceForPushType('rh_extraccion_documento')).toBe('rh');
    expect(experienceForPushType('formato_disponible')).toBe('rh');
  });

  it('tipos de colaborador pertenecen a Mi espacio', () => {
    expect(experienceForPushType('solicitud')).toBe('colaborador');
    expect(experienceForPushType('cumpleanos')).toBe('colaborador');
    expect(experienceForPushType('documento_laboral')).toBe('colaborador');
  });

  it('sin tipo no decide ninguna experiencia', () => {
    expect(experienceForPushType(undefined)).toBeNull();
  });
});
