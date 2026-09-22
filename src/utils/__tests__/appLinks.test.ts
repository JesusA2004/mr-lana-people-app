import { experienceForPushType, isPushForCurrentUser, normalizeResourceId, resolveResourceRoute } from '../appLinks';

/**
 * Cada tipo aquí está CONFIRMADO contra un emisor real del backend
 * (capacitaciones: PushNotifier::aUsuario*, NotificadorRhService::notificar,
 * DispositivoController::pushPrueba). Si el backend agrega un tipo nuevo, se
 * agrega aquí junto con su ruta — nunca por adelantado.
 */
const CASOS: [type: string, resourceId: number | null, route: string, experience: 'rh' | 'colaborador' | null][] = [
  ['solicitud', 123, '/solicitud/123', 'colaborador'],
  ['vacaciones', 9, '/(app)/(tabs)/vacaciones', 'colaborador'],
  ['documento', 77, '/expediente/77?ref=documento', 'colaborador'],
  ['incorporacion', 5, '/incorporacion', 'colaborador'],
  ['cumpleanos', 3, '/cumpleanos', 'colaborador'],
  ['rh_solicitud', 184, '/(app)/rh/solicitudes/184', 'rh'],
  ['rh_vacaciones', 12, '/(app)/rh/vacaciones/12', 'rh'],
  ['rh_documento', 431, '/(app)/rh/documentos/431', 'rh'],
  ['rh_incorporacion', 20, '/(app)/rh/incorporaciones/20', 'rh'],
  ['rh_cumpleanos', 42, '/(app)/rh/cumpleanos/42', 'rh'],
  ['documento_firma_pendiente', 300, '/documentos-laborales/300', 'colaborador'],
  ['recibo_nomina', 88, '/recibos/88', 'colaborador'],
  ['prestamo_autorizado', 15, '/prestamos/15', 'colaborador'],
  ['expediente_incompleto', 7, '/(app)/(tabs)/expediente', 'colaborador'],
  ['alta_activada', 7, '/(app)/(tabs)', 'colaborador'],
  ['visto_bueno_pendiente', 44, '/equipo', null],
  ['evaluacion_pendiente', 61, '/evaluaciones/61', null],
  ['evaluacion_devuelta', 61, '/evaluaciones/61', null],
  ['evaluacion_capturada', 61, '/evaluaciones/61', null],
  ['contrato_por_vencer', 90, '/(app)/rh/contratos/por-vencer', 'rh'],
];

describe('resolveResourceRoute — tipos reales del backend', () => {
  it.each(CASOS)('%s (#%s) → %s', (type, resourceId, route) => {
    expect(resolveResourceRoute({ type, resource_id: resourceId })).toBe(route);
  });

  it.each(CASOS)('%s pertenece a la experiencia correcta', (type, _id, _route, experience) => {
    expect(experienceForPushType(type)).toBe(experience);
  });

  it('sin resource_id cae en la lista correspondiente, nunca en una ruta con "undefined"', () => {
    expect(resolveResourceRoute({ type: 'solicitud' })).toBe('/(app)/(tabs)/solicitudes');
    expect(resolveResourceRoute({ type: 'documento' })).toBe('/(app)/(tabs)/expediente');
    expect(resolveResourceRoute({ type: 'documento_firma_pendiente', resource_id: null })).toBe('/documentos-laborales');
    expect(resolveResourceRoute({ type: 'recibo_nomina' })).toBe('/recibos');
    expect(resolveResourceRoute({ type: 'prestamo_autorizado' })).toBe('/prestamos');
    expect(resolveResourceRoute({ type: 'evaluacion_pendiente' })).toBe('/evaluaciones');
    expect(resolveResourceRoute({ type: 'rh_solicitud' })).toBe('/(app)/rh/(tabs)/pendientes');
  });

  it('rh_cumpleanos sin resource_id navega por periodo (nunca inventa un id)', () => {
    expect(resolveResourceRoute({ type: 'rh_cumpleanos', resource_id: null, periodo: 'hoy' })).toBe('/(app)/rh/cumpleanos?periodo=hoy');
    expect(resolveResourceRoute({ type: 'rh_cumpleanos' })).toBe('/(app)/rh/cumpleanos');
  });

  it('push_test abre Diagnóstico Push (build con herramientas de QA)', () => {
    // En jest __DEV__ es true → SHOW_DEV_TOOLS.
    expect(resolveResourceRoute({ type: 'push_test', resource_id: null })).toBe('/dev/diagnostico-push');
    expect(experienceForPushType('push_test')).toBeNull();
  });

  it('tipos no emitidos por el backend no resuelven ruta (quien llama cae en notificaciones)', () => {
    for (const type of ['perfil', 'notificacion', 'baja', 'documento_laboral', 'rh_pendiente', 'formato_disponible', 'modulo_futuro']) {
      expect(resolveResourceRoute({ type, resource_id: 9 })).toBeNull();
      expect(experienceForPushType(type)).toBeNull();
    }
    expect(resolveResourceRoute({})).toBeNull();
  });

  it('un push de solicitud con "estado" sigue resolviendo al detalle exacto', () => {
    expect(resolveResourceRoute({ type: 'solicitud', resource_id: 184, estado: 'aprobada' })).toBe('/solicitud/184');
  });
});

describe('normalizeResourceId — nunca una ruta armada con datos inválidos', () => {
  it('acepta enteros positivos como número o string', () => {
    expect(normalizeResourceId(12)).toBe('12');
    expect(normalizeResourceId(' 12 ')).toBe('12');
  });

  it('rechaza vacíos, negativos, decimales y texto con separadores de ruta', () => {
    for (const raw of [null, undefined, '', 0, -3, 1.5, 'abc', '12/../../perfil', '12?x=1']) {
      expect(normalizeResourceId(raw as never)).toBeNull();
    }
    expect(resolveResourceRoute({ type: 'solicitud', resource_id: '12/../../perfil' })).toBe('/(app)/(tabs)/solicitudes');
  });
});

describe('isPushForCurrentUser — cambio de cuenta en el mismo teléfono', () => {
  it('abre el push del usuario con sesión', () => {
    expect(isPushForCurrentUser({ type: 'recibo_nomina', user_id: 7 }, 7)).toBe(true);
    expect(isPushForCurrentUser({ type: 'recibo_nomina', user_id: '7' }, 7)).toBe(true);
  });

  it('NO abre un push de la cuenta anterior', () => {
    expect(isPushForCurrentUser({ type: 'recibo_nomina', user_id: 7 }, 8)).toBe(false);
    expect(isPushForCurrentUser({ type: 'recibo_nomina', user_id: 7 }, null)).toBe(false);
  });

  it('pushes sin user_id (backend anterior) se aceptan: el backend sigue protegiendo el recurso', () => {
    expect(isPushForCurrentUser({ type: 'solicitud' }, 8)).toBe(true);
  });
});
