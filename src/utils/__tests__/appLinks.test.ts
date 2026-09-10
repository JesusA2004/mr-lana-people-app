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

  it('rh_cumpleanos cae en notificaciones RH (sin API dedicada todavía)', () => {
    expect(resolveResourceRoute({ type: 'rh_cumpleanos' })).toBe('/(app)/rh/(tabs)/notificaciones');
  });
});

describe('experienceForPushType', () => {
  it('tipos rh_* pertenecen a la experiencia RH', () => {
    expect(experienceForPushType('rh_solicitud')).toBe('rh');
    expect(experienceForPushType('rh_cumpleanos')).toBe('rh');
  });

  it('tipos de colaborador pertenecen a Mi espacio', () => {
    expect(experienceForPushType('solicitud')).toBe('colaborador');
    expect(experienceForPushType('cumpleanos')).toBe('colaborador');
  });

  it('sin tipo no decide ninguna experiencia', () => {
    expect(experienceForPushType(undefined)).toBeNull();
  });
});
