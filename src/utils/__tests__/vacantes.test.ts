import { diasVacanteAbierta } from '../vacantes';

describe('diasVacanteAbierta', () => {
  it('null sin fecha_apertura', () => {
    expect(diasVacanteAbierta(undefined)).toBeNull();
    expect(diasVacanteAbierta(null)).toBeNull();
  });

  it('0 el mismo día de apertura', () => {
    const hoy = new Date();
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    expect(diasVacanteAbierta(iso)).toBe(0);
  });

  it('nunca negativo (fecha futura por reloj desincronizado)', () => {
    const futura = new Date();
    futura.setDate(futura.getDate() + 5);
    const iso = `${futura.getFullYear()}-${String(futura.getMonth() + 1).padStart(2, '0')}-${String(futura.getDate()).padStart(2, '0')}`;
    expect(diasVacanteAbierta(iso)).toBe(0);
  });
});
