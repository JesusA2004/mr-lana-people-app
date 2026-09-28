import { aplicaALabel, buildManualesPayload, manualesPendientes, puedeIniciarGeneracion } from '../formatoOficial';

import type { OfficialFormatManual } from '@/types/formatoOficial';

describe('puedeIniciarGeneracion', () => {
  it('false si falta configurar ("lista" en false)', () => {
    expect(puedeIniciarGeneracion({ lista: false, archivado: false })).toBe(false);
  });

  it('false si está archivado', () => {
    expect(puedeIniciarGeneracion({ lista: true, archivado: true })).toBe(false);
  });

  it('true solo cuando está listo y no archivado', () => {
    expect(puedeIniciarGeneracion({ lista: true, archivado: false })).toBe(true);
  });
});

describe('aplicaALabel', () => {
  it('traduce los tres valores conocidos', () => {
    expect(aplicaALabel('colaborador')).toBe('Colaboradores');
    expect(aplicaALabel('candidato')).toBe('Candidatos');
    expect(aplicaALabel('ambos')).toBe('Colaboradores y candidatos');
  });

  it('regresa el valor tal cual si el backend manda algo desconocido', () => {
    expect(aplicaALabel('otro')).toBe('otro');
  });
});

describe('manualesPendientes / buildManualesPayload', () => {
  const manuales: OfficialFormatManual[] = [
    { clave: 'motivo', etiqueta: 'Motivo', requerido: true, valor: '' },
    { clave: 'observaciones', etiqueta: 'Observaciones', requerido: false, valor: '' },
    { clave: 'folio_previo', etiqueta: 'Folio previo', requerido: true, valor: 'ABC-123' },
  ];

  it('marca como pendiente un requerido sin valor capturado ni previo', () => {
    const pendientes = manualesPendientes(manuales, {});
    expect(pendientes.map((m) => m.clave)).toEqual(['motivo']);
  });

  it('un requerido con valor previo del backend ya no está pendiente', () => {
    const pendientes = manualesPendientes(manuales, {});
    expect(pendientes.some((m) => m.clave === 'folio_previo')).toBe(false);
  });

  it('capturar el valor en la sesión actual lo quita de pendientes', () => {
    const pendientes = manualesPendientes(manuales, { motivo: 'Constancia para trámite' });
    expect(pendientes).toHaveLength(0);
  });

  it('un valor de solo espacios sigue contando como pendiente', () => {
    const pendientes = manualesPendientes(manuales, { motivo: '   ' });
    expect(pendientes.map((m) => m.clave)).toEqual(['motivo']);
  });

  it('nunca marca como pendiente un campo opcional vacío', () => {
    const pendientes = manualesPendientes(manuales, {});
    expect(pendientes.some((m) => m.clave === 'observaciones')).toBe(false);
  });

  it('buildManualesPayload solo incluye claves con valor no vacío', () => {
    const payload = buildManualesPayload(manuales, { motivo: 'Constancia', observaciones: '  ' });
    expect(payload).toEqual({ motivo: 'Constancia', folio_previo: 'ABC-123' });
  });

  it('buildManualesPayload recorta espacios', () => {
    const payload = buildManualesPayload(manuales, { motivo: '  Constancia  ' });
    expect(payload.motivo).toBe('Constancia');
  });
});
