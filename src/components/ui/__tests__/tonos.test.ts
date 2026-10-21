import { coloresTono, porcentajeSeguro, textoBadge, textoConteo, type Tono } from '../tonos';

import { Colors } from '@/constants/colors';

describe('coloresTono', () => {
  const tonos: Tono[] = ['primario', 'exito', 'aviso', 'peligro', 'info', 'neutral', 'celebracion'];

  it('usa SOLO tokens de la paleta (nunca hex sueltos)', () => {
    const paleta = new Set(Object.values(Colors));
    for (const tono of tonos) {
      const c = coloresTono(Colors, tono);
      expect(paleta.has(c.texto)).toBe(true);
      expect(paleta.has(c.fondo)).toBe(true);
      expect(paleta.has(c.borde)).toBe(true);
    }
  });

  it('mapea los estados a sus tokens semánticos', () => {
    expect(coloresTono(Colors, 'peligro')).toEqual({ texto: Colors.danger, fondo: Colors.dangerSoft, borde: Colors.dangerSoft });
    expect(coloresTono(Colors, 'exito').texto).toBe(Colors.success);
    expect(coloresTono(Colors, 'aviso').fondo).toBe(Colors.warningSoft);
    expect(coloresTono(Colors, 'primario').texto).toBe(Colors.primaryDark);
  });
});

describe('porcentajeSeguro', () => {
  it('acota a 0–100 y redondea', () => {
    expect(porcentajeSeguro(-5)).toBe(0);
    expect(porcentajeSeguro(140)).toBe(100);
    expect(porcentajeSeguro(66.6)).toBe(67);
  });

  it('trata null/NaN/Infinity como 0', () => {
    expect(porcentajeSeguro(null)).toBe(0);
    expect(porcentajeSeguro(undefined)).toBe(0);
    expect(porcentajeSeguro(Number.NaN)).toBe(0);
    expect(porcentajeSeguro(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('textoConteo / textoBadge', () => {
  it('singular, plural y nada para cero', () => {
    expect(textoConteo(1, 'pendiente', 'pendientes')).toBe('1 pendiente');
    expect(textoConteo(3, 'pendiente', 'pendientes')).toBe('3 pendientes');
    expect(textoConteo(0, 'pendiente', 'pendientes')).toBeNull();
    expect(textoConteo(undefined, 'pendiente', 'pendientes')).toBeNull();
  });

  it('badge compacto con tope 99+', () => {
    expect(textoBadge(0)).toBeNull();
    expect(textoBadge(7)).toBe('7');
    expect(textoBadge(99)).toBe('99');
    expect(textoBadge(250)).toBe('99+');
  });
});
