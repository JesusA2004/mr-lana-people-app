import type { RhPrestamoDecision, RhSolicitud } from '@/types/rh';

import { formatCurrencyMXN } from '../formatters';
import { formatPlazoMeses, prestamoAutorizacionInicial } from '../loan';
import {
  describirVistoBueno,
  motivoNoAutorizable,
  puedeAprobarSolicitudComplejaMovil,
  requiereRevisionPortal,
  usaRechazoGenerico,
} from '../rhActions';

/** Forma real de `GET /api/v1/rh/solicitudes/{id}` → `data.prestamo` (capacitaciones@4b0315d). */
function prestamo(overrides: Partial<RhPrestamoDecision> = {}): RhPrestamoDecision {
  return {
    monto_solicitado: 5000,
    plazo_solicitado: 6,
    visto_bueno: { requerido: true, estado: 'aprobado', jefe: 'Ana Jefa', comentario: 'Adelante', fecha: '2026-09-20T10:00:00-06:00' },
    prestamo_id: null,
    puede_autorizar: true,
    puede_rechazar: true,
    ...overrides,
  };
}

function solicitud(overrides: Partial<RhSolicitud> = {}): Pick<
  RhSolicitud,
  'tipo' | 'prestamo' | 'acciones_permitidas' | 'colaborador_objetivo' | 'fecha_efectiva' | 'tipo_baja'
> {
  return { tipo: 'prestamo', prestamo: prestamo(), acciones_permitidas: ['ver', 'aprobar', 'rechazar'], ...overrides };
}

describe('préstamo RH: botones genéricos', () => {
  it('nunca ofrece el Aprobar genérico para un préstamo, aunque acciones_permitidas traiga "aprobar"', () => {
    expect(puedeAprobarSolicitudComplejaMovil(solicitud())).toBe(false);
    expect(puedeAprobarSolicitudComplejaMovil(solicitud({ prestamo: null }))).toBe(false);
  });

  it('no duplica "Rechazar": con bloque prestamo, el rechazo va por PrestamoDecision', () => {
    expect(usaRechazoGenerico(solicitud())).toBe(false);
  });

  it('backend viejo sin bloque prestamo: conserva el Rechazar genérico y manda a Portal RH', () => {
    const s = solicitud({ prestamo: null });
    expect(usaRechazoGenerico(s)).toBe(true);
    expect(requiereRevisionPortal(s)).toBe(true);
  });

  it('con bloque prestamo no pide Portal RH', () => {
    expect(requiereRevisionPortal(solicitud())).toBe(false);
  });

  it('otros tipos siguen usando acciones_permitidas', () => {
    const vac = solicitud({ tipo: 'vacaciones', prestamo: null });
    expect(puedeAprobarSolicitudComplejaMovil(vac)).toBe(true);
    expect(usaRechazoGenerico(vac)).toBe(true);
    expect(usaRechazoGenerico({ ...vac, acciones_permitidas: ['ver'] })).toBe(false);
    expect(requiereRevisionPortal(vac)).toBe(false);
  });

  it('baja de colaborador sin campos sigue bloqueada', () => {
    const baja = solicitud({ tipo: 'baja_colaborador', prestamo: null });
    expect(puedeAprobarSolicitudComplejaMovil(baja)).toBe(false);
    expect(requiereRevisionPortal(baja)).toBe(true);
  });
});

describe('préstamo RH: visto bueno y autoridad', () => {
  it('describe cada estado con texto (no solo color)', () => {
    expect(describirVistoBueno({ requerido: true, estado: 'aprobado' })).toEqual({ label: 'Visto bueno aprobado', tone: 'success' });
    expect(describirVistoBueno({ requerido: true, estado: 'pendiente' }).label).toBe('Pendiente de visto bueno');
    expect(describirVistoBueno({ requerido: true, estado: 'rechazado' }).tone).toBe('danger');
    expect(describirVistoBueno({ requerido: false, estado: 'no_aplica' }).label).toBe('No requiere visto bueno');
    expect(describirVistoBueno({ requerido: true, estado: 'en_espera' }).label).toBe('Visto bueno: en espera');
  });

  it('puede_autorizar=true → sin motivo de bloqueo', () => {
    expect(motivoNoAutorizable(prestamo())).toBeNull();
  });

  it('puede_autorizar=false con visto bueno pendiente → lo dice', () => {
    const p = prestamo({ puede_autorizar: false, visto_bueno: { requerido: true, estado: 'pendiente' } });
    expect(motivoNoAutorizable(p)).toBe('Pendiente de visto bueno del jefe inmediato.');
  });

  it('puede_autorizar=false sin monto → no inventa monto', () => {
    const p = prestamo({ puede_autorizar: false, monto_solicitado: null, visto_bueno: { requerido: false, estado: 'no_aplica' } });
    expect(motivoNoAutorizable(p)).toMatch(/no indica un monto/);
  });

  it('puede_autorizar=false por política (rol) → mensaje de permiso, aunque haya monto y visto bueno', () => {
    expect(motivoNoAutorizable(prestamo({ puede_autorizar: false }))).toBe('Tu cuenta no puede autorizar este préstamo.');
  });
});

describe('préstamo RH: sin NaN', () => {
  it('monto null no formatea como $NaN', () => {
    expect(formatCurrencyMXN(null)).toBe('—');
    expect(formatCurrencyMXN(Number.NaN)).toBe('—');
  });

  it('plazo null/undefined/basura → null (nunca "NaN meses" ni "undefined meses")', () => {
    expect(formatPlazoMeses(null)).toBeNull();
    expect(formatPlazoMeses(undefined)).toBeNull();
    expect(formatPlazoMeses('abc')).toBeNull();
    expect(formatPlazoMeses(1)).toBe('1 mes');
    expect(formatPlazoMeses(12)).toBe('12 meses');
  });

  it('prellena autorización con lo solicitado y periodicidad mensual (plazo en meses)', () => {
    expect(prestamoAutorizacionInicial(prestamo())).toEqual({ monto: '5000', plazo: '6', periodicidad: 'mensual' });
  });

  it('sin plazo/monto deja el formulario vacío en vez de "null"', () => {
    expect(prestamoAutorizacionInicial({ monto_solicitado: null, plazo_solicitado: null })).toEqual({ monto: '', plazo: '', periodicidad: 'quincenal' });
  });
});
