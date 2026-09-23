import type { Solicitud } from '@/types/request';

import { buildLoanRequestPayload, loanRequestsInProgress, loanStagesToTimeline, validateLoanRequest } from '../loanRequest';

describe('solicitud de préstamo del colaborador', () => {
  it('el payload lleva SOLO tipo, monto y motivo', () => {
    expect(buildLoanRequestPayload(8000, '  Reparación del auto  ')).toEqual({ tipo: 'prestamo', monto_solicitado: 8000, motivo: 'Reparación del auto' });
  });

  it('no exige plazo: monto + motivo bastan', () => {
    expect(validateLoanRequest(8000, 'Reparación')).toEqual({});
  });

  it('monto vacío, cero, negativo o NaN es inválido (nunca se envía NaN)', () => {
    expect(validateLoanRequest(undefined, 'x').monto).toBeTruthy();
    expect(validateLoanRequest(0, 'x').monto).toBeTruthy();
    expect(validateLoanRequest(-5, 'x').monto).toBeTruthy();
    expect(validateLoanRequest(Number.NaN, 'x').monto).toBeTruthy();
  });

  it('motivo requerido y con límite', () => {
    expect(validateLoanRequest(100, '   ').motivo).toBeTruthy();
    expect(validateLoanRequest(100, 'a'.repeat(501)).motivo).toBeTruthy();
  });

  it('redondea el monto a centavos', () => {
    expect(buildLoanRequestPayload(1234.567, 'x').monto_solicitado).toBe(1234.57);
  });
});

describe('seguimiento de préstamos', () => {
  const etapas = (estados: [string, string][]) => estados.map(([clave, estado]) => ({ clave, etiqueta: clave, estado }));

  it('traduce etapas del backend al timeline', () => {
    expect(loanStagesToTimeline(etapas([['solicitud', 'hecho'], ['visto_bueno', 'actual'], ['firma', 'pendiente'], ['autorizacion', 'rechazado']])).map((i) => i.status)).toEqual([
      'done',
      'current',
      'pending',
      'cancelled',
    ]);
  });

  it('en trámite: préstamos con una etapa actual o rechazada; los firmados y otros tipos no', () => {
    const solicitudes = [
      { id: 1, tipo: 'prestamo', estado: 'enviada', prestamo: { etapas: etapas([['solicitud', 'hecho'], ['visto_bueno', 'actual']]) } },
      { id: 2, tipo: 'prestamo', estado: 'aprobada', prestamo: { etapas: etapas([['autorizacion', 'hecho'], ['firma', 'hecho']]) } },
      { id: 3, tipo: 'vacaciones', estado: 'enviada' },
      { id: 4, tipo: 'prestamo', estado: 'cancelada', prestamo: { etapas: etapas([['visto_bueno', 'actual']]) } },
    ] as unknown as Solicitud[];

    expect(loanRequestsInProgress(solicitudes).map((s) => s.id)).toEqual([1]);
  });
});
