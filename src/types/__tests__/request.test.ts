import { solicitudResource } from '@/test/fixtures/backend';
import { canCancelSolicitud, CANCELABLE_REQUEST_STATUSES, FINAL_REQUEST_STATUSES, REQUEST_STATUSES, REQUEST_TYPES } from '../request';

describe('catálogos de solicitudes', () => {
  it('replica los 17 casos de TipoSolicitudInterna con sus claves exactas', () => {
    expect(REQUEST_TYPES).toHaveLength(17);
    expect(REQUEST_TYPES).toContain('prestamo');
    expect(REQUEST_TYPES).toContain('solicitud_general');
    expect(REQUEST_TYPES).toContain('permiso_especial_cumpleanos');
    expect(REQUEST_TYPES as readonly string[]).not.toContain('prestamo_interno');
    expect(REQUEST_TYPES as readonly string[]).not.toContain('general');
  });

  it('replica los 8 estados de EstadoSolicitudInterna', () => {
    expect(REQUEST_STATUSES).toHaveLength(8);
    expect(FINAL_REQUEST_STATUSES).toEqual(['rechazada', 'cancelada', 'cerrada']);
  });

  it('los estados cancelables son exactamente los de EstadoSolicitudInterna::puedeCancelarse()', () => {
    expect(CANCELABLE_REQUEST_STATUSES).toEqual(['creada', 'enviada', 'en_revision', 'requiere_correccion']);
  });
});

describe('canCancelSolicitud', () => {
  it('permite cancelar una solicitud recién enviada (fixture real)', () => {
    expect(canCancelSolicitud(solicitudResource)).toBe(true);
  });

  it('no ofrece cancelar sobre un estado ya resuelto', () => {
    for (const estado of ['aprobada', 'rechazada', 'cancelada', 'cerrada']) {
      expect(canCancelSolicitud({ estado })).toBe(false);
    }
  });

  it('si el backend algún día manda acciones_permitidas, ESE campo manda', () => {
    // Estado cancelable, pero el backend dice que no: gana el backend.
    expect(canCancelSolicitud({ estado: 'enviada', acciones_permitidas: ['ver'] })).toBe(false);
    // Estado que la app creería final, pero el backend lo autoriza: gana el backend.
    expect(canCancelSolicitud({ estado: 'aprobada', acciones_permitidas: ['ver', 'cancelar'] })).toBe(true);
  });

  it('tolera undefined y estados desconocidos sin lanzar', () => {
    expect(canCancelSolicitud(undefined)).toBe(false);
    expect(canCancelSolicitud({})).toBe(false);
    expect(canCancelSolicitud({ estado: 'estado_futuro' })).toBe(false);
  });
});
