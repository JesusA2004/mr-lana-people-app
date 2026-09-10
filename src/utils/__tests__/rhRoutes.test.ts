import { rhPendienteDetailRoute } from '../rhRoutes';

describe('rhPendienteDetailRoute', () => {
  it('mapea cada tipo a su pantalla de detalle real', () => {
    expect(rhPendienteDetailRoute({ tipo: 'solicitud', resource_id: 184 })).toBe('/(app)/rh/solicitudes/184');
    expect(rhPendienteDetailRoute({ tipo: 'vacaciones', resource_id: 5 })).toBe('/(app)/rh/vacaciones/5');
    expect(rhPendienteDetailRoute({ tipo: 'documento', resource_id: 9 })).toBe('/(app)/rh/documentos/9');
    expect(rhPendienteDetailRoute({ tipo: 'incorporacion', resource_id: 52 })).toBe('/(app)/rh/incorporaciones/52');
  });
});
