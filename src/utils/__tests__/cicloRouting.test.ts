import { keysToInvalidate } from '@/hooks/queries/cicloInvalidate';
import { queryKeys } from '@/api/queryKeys';
import { experienceForPushType, resolveResourceRoute } from '../appLinks';
import { MISSING_TEMPLATE_MESSAGE, normalizeError } from '../errors';
import { isRhModuleEnabled, isSelfServiceModuleEnabled, visibleColaboradorSections } from '../modules';
import { pushCicloKeys } from '../pushInvalidation';
import { resolveTaskRoute } from '../taskRoutes';
import { formatDateLong } from '../dates';

describe('push routing — ciclo laboral', () => {
  it('abre el detalle real de cada tipo nuevo', () => {
    expect(resolveResourceRoute({ type: 'documento_firma_pendiente', resource_id: 5 })).toBe('/documentos-laborales/5');
    expect(resolveResourceRoute({ type: 'recibo_nomina', resource_id: 8 })).toBe('/recibos/8');
    expect(resolveResourceRoute({ type: 'prestamo_autorizado', resource_id: 3 })).toBe('/prestamos/3');
    expect(resolveResourceRoute({ type: 'evaluacion_pendiente', resource_id: 2 })).toBe('/evaluaciones/2');
    expect(resolveResourceRoute({ type: 'visto_bueno_pendiente', resource_id: 11 })).toBe('/equipo');
    expect(resolveResourceRoute({ type: 'contrato_por_vencer', resource_id: 1 })).toBe('/(app)/rh/contratos/por-vencer');
    expect(resolveResourceRoute({ type: 'expediente_incompleto' })).toBe('/(app)/(tabs)/expediente');
  });

  it('decide la experiencia (compartidas no cambian de árbol)', () => {
    expect(experienceForPushType('contrato_por_vencer')).toBe('rh');
    expect(experienceForPushType('documento_firma_pendiente')).toBe('colaborador');
    expect(experienceForPushType('evaluacion_capturada')).toBeNull();
    expect(experienceForPushType('visto_bueno_pendiente')).toBeNull();
  });

  it('invalida solo las cachés relacionadas', () => {
    expect(pushCicloKeys('recibo_nomina')).toEqual([queryKeys.misRecibos]);
    expect(pushCicloKeys('desconocido')).toEqual([]);
  });
});

describe('rutas de tareas (nunca por título)', () => {
  const base = { tipo: 'x', accion: null, related_type: null, related_id: null, colaborador: null };

  it('firma → Mi espacio; etapas físicas → Gestión RH', () => {
    expect(resolveTaskRoute({ ...base, tipo: 'firma_pendiente', accion: 'firmar_documento', related_type: 'GeneratedDocument', related_id: 4 })).toEqual({
      route: '/documentos-laborales/4',
      experience: 'colaborador',
    });
    expect(resolveTaskRoute({ ...base, tipo: 'impresion_pendiente', related_type: 'GeneratedDocument', related_id: 4 })?.experience).toBe('rh');
  });

  it('evaluación compartida, visto bueno a equipo, préstamo y cierre a RH', () => {
    expect(resolveTaskRoute({ ...base, related_type: 'EvaluacionPeriodoPrueba', related_id: 2 })).toEqual({ route: '/evaluaciones/2', experience: null });
    expect(resolveTaskRoute({ ...base, related_type: 'SolicitudInterna', related_id: 2, accion: 'visto_bueno' })?.route).toBe('/equipo');
    expect(resolveTaskRoute({ ...base, related_type: 'Prestamo', related_id: 6 })?.route).toBe('/(app)/rh/prestamos/6');
    expect(resolveTaskRoute({ ...base, related_type: 'CierreLaboral', related_id: 6 })?.route).toBe('/(app)/rh/cierres/6');
    expect(resolveTaskRoute({ ...base, related_type: 'Colaborador', related_id: 6, accion: 'subir_documentos' })?.experience).toBe('colaborador');
    expect(resolveTaskRoute({ ...base, related_type: 'Desconocido', related_id: 1 })).toBeNull();
  });
});

describe('errores 422', () => {
  const err = (status: number, data: unknown) => ({ isAxiosError: true, response: { status, data } });

  it('plantilla faltante NO es "error inesperado"', () => {
    const e = normalizeError(err(422, { message: 'No hay una plantilla activa…', errors: { plantilla: ['No hay una plantilla activa para «Pagaré» (clave pagare).'] } }));
    expect(e.isMissingTemplate).toBe(true);
    expect(e.message).toBe(MISSING_TEMPLATE_MESSAGE);
    expect(e.detail).toMatch(/Pagaré/);
  });

  it('otros 422 conservan el mensaje por campo', () => {
    const e = normalizeError(err(422, { message: 'El monto es requerido', errors: { monto_autorizado: ['El monto es requerido'] } }));
    expect(e.isMissingTemplate).toBeUndefined();
    expect(e.validationErrors?.monto_autorizado).toEqual(['El monto es requerido']);
  });
});

describe('permisos / feature flags', () => {
  it('autoservicio visible salvo feature explícito false', () => {
    expect(isSelfServiceModuleEnabled(undefined, 'recibos')).toBe(true);
    expect(isSelfServiceModuleEnabled({ recibos: false } as never, 'recibos')).toBe(false);
  });

  it('módulos RH solo con permiso real', () => {
    expect(isRhModuleEnabled(undefined, ['nomina.recibos.ver'], 'recibos')).toBe(true);
    expect(isRhModuleEnabled(undefined, [], 'recibos')).toBe(false);
    expect(isRhModuleEnabled({ rh_recibos: false } as never, ['nomina.recibos.ver'], 'recibos')).toBe(false);
    expect(isRhModuleEnabled(undefined, ['evaluaciones.autorizar'], 'evaluaciones')).toBe(true);
  });

  it('secciones del colaborador por permiso', () => {
    expect(visibleColaboradorSections(['contratos.ver'])).toEqual(['contratos']);
    expect(visibleColaboradorSections([])).toEqual([]);
  });
});

describe('invalidación granular', () => {
  it('firma → documentos, alta, expediente, tareas, notificaciones', () => {
    const keys = keysToInvalidate({ type: 'documento_firmado' });
    expect(keys).toEqual(expect.arrayContaining([queryKeys.laborDocumentsRoot, queryKeys.miAlta, queryKeys.miExpediente, queryKeys.tareas, queryKeys.notificaciones]));
  });

  it('autorizar evaluación → evaluaciones, contratos, tareas, dashboard RH', () => {
    const keys = keysToInvalidate({ type: 'evaluacion_autorizada', evaluacionId: 1 });
    expect(keys).toEqual(expect.arrayContaining([queryKeys.evaluaciones, queryKeys.rhContratos, queryKeys.tareas, queryKeys.rhDashboard]));
  });

  it('visto bueno no refresca toda la app', () => {
    const keys = keysToInvalidate({ type: 'visto_bueno', solicitudId: 3 });
    expect(keys).toContainEqual(queryKeys.solicitud(3));
    expect(keys).not.toContainEqual(['rh']);
  });
});

describe('fechas de calendario', () => {
  it('YYYY-MM-DD no retrocede un día por UTC', () => {
    expect(formatDateLong('2026-09-22')).toMatch(/22/);
  });
});
