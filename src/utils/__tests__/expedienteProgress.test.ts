import { documentStatusGlyph, progressBreakdown, progressHeadline, toExpedienteProgress } from '../expedienteProgress';

describe('avance del expediente (presentación de la regla del backend)', () => {
  it('8 de 11 con 1 en revisión y 2 faltantes NO es 100', () => {
    const p = toExpedienteProgress({ total_obligatorios: 11, completos: 8, faltantes: 2, en_revision: 1, rechazados: 0, porcentaje: 72, completo: false });
    expect(p.porcentaje).toBe(72);
    expect(p.completo).toBe(false);
    expect(p.pendientes).toBe(3);
    expect(progressHeadline(p)).toBe('8 de 11 documentos completos');
    expect(progressBreakdown(p)).toBe('2 por subir · 1 en revisión');
  });

  it('11 de 11 = 100 y "Expediente completo"', () => {
    const p = toExpedienteProgress({ total_obligatorios: 11, completos: 11, porcentaje: 100, completo: true });
    expect(p.porcentaje).toBe(100);
    expect(p.completo).toBe(true);
    expect(progressHeadline(p)).toBe('Expediente completo');
  });

  it('en revisión no cuenta como completo aunque un backend anterior dijera 100', () => {
    // Backend viejo: round() podía dar 100 con un documento pendiente.
    const p = toExpedienteProgress({ total: 200, aprobados: 199, pendientes: 0, en_revision: 1, rechazados: 0, porcentaje: 100 });
    expect(p.completo).toBe(false);
    expect(p.porcentaje).toBe(99);
  });

  it('nunca produce NaN ni decimales', () => {
    expect(toExpedienteProgress(undefined).porcentaje).toBe(0);
    expect(toExpedienteProgress({ total_obligatorios: 10, completos: 3, porcentaje: Number.NaN }).porcentaje).toBe(0);
    expect(toExpedienteProgress({ total_obligatorios: 3, completos: 1, porcentaje: 33.33 }).porcentaje).toBe(33);
  });

  it('sin obligatorios: sin porcentaje decorativo', () => {
    const p = toExpedienteProgress({ total_obligatorios: 0, completos: 0, porcentaje: 0, sin_obligatorios: true, completo: true });
    expect(p.porcentaje).toBe(0);
    expect(p.completo).toBe(false);
    expect(progressHeadline(p)).toBe('Sin documentos obligatorios');
  });

  it('acepta las claves previas (total/aprobados/pendientes)', () => {
    const p = toExpedienteProgress({ total: 10, aprobados: 5, pendientes: 5, en_revision: 0, rechazados: 0, porcentaje: 50 });
    expect([p.total, p.completos, p.faltantes, p.porcentaje]).toEqual([10, 5, 5, 50]);
  });

  it('estado de documento con ícono + palabra (no solo color)', () => {
    expect(documentStatusGlyph('aprobado')).toMatchObject({ icon: 'checkmark-circle', label: 'Completo' });
    expect(documentStatusGlyph('pendiente').label).toBe('Falta subir');
    expect(documentStatusGlyph('en_revision').label).toBe('En revisión');
    expect(documentStatusGlyph('requiere_correccion').label).toBe('Requiere corrección');
    expect(documentStatusGlyph('rechazado').label).toBe('Rechazado');
    expect(documentStatusGlyph(undefined).label).toBe('Falta subir');
  });
});
