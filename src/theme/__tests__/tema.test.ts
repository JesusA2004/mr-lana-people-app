import { construirTema } from '../tema';

import { Palettes } from '@/constants/colors';

describe('tema dinámico (Apariencia del backend)', () => {
  it('sin tema remoto usa la paleta base', () => {
    expect(construirTema('light', null).colors).toEqual(Palettes.light);
    expect(construirTema('dark', undefined).colors).toEqual(Palettes.dark);
  });

  it('aplica los colores de marca que configuró RH', () => {
    const { colors } = construirTema('light', { primary: '#123456', secondary: '#abcdef', danger: '#ff0000', background: '#fafafa' });
    expect(colors.primary).toBe('#123456');
    expect(colors.secondary).toBe('#abcdef');
    expect(colors.danger).toBe('#ff0000');
    expect(colors.background).toBe('#fafafa');
  });

  it('ignora valores que no son hex (nunca rompe la app)', () => {
    const { colors } = construirTema('light', { primary: 'rojo', secondary: 'javascript:alert(1)', success: '#12' });
    expect(colors.primary).toBe(Palettes.light.primary);
    expect(colors.secondary).toBe(Palettes.light.secondary);
    expect(colors.success).toBe(Palettes.light.success);
  });

  it('en oscuro cambia la marca pero no el fondo/superficie (texto siempre legible)', () => {
    const { colors } = construirTema('dark', { primary: '#00aa00', background: '#ffffff', surface: '#ffffff' });
    expect(colors.primary).toBe('#00aa00');
    expect(colors.background).toBe(Palettes.dark.background);
    expect(colors.surface).toBe(Palettes.dark.surface);
  });
});
