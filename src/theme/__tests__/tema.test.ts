import { construirTema } from '../tema';

import { ColorSchemeAtLaunch, LoginColors, Palettes } from '@/constants/colors';

describe('tema dinámico (Apariencia del backend)', () => {
  it('sin tema remoto usa la paleta base clara', () => {
    expect(construirTema(null).colors).toEqual(Palettes.light);
    expect(construirTema(undefined).scheme).toBe('light');
  });

  it('aplica los colores de marca que configuró RH', () => {
    const { colors } = construirTema({ primary: '#123456', gold: '#abcdef', goldDark: '#654321', danger: '#ff0000', background: '#fafafa', muted: '#a7ac9c' });
    expect(colors.primary).toBe('#123456');
    expect(colors.secondary).toBe('#abcdef');
    expect(colors.warning).toBe('#654321');
    // El gris verdoso de Apariencia no se usa como texto (sin contraste).
    expect(colors.textMuted).toBe(Palettes.light.textMuted);
    expect(colors.danger).toBe('#ff0000');
    expect(colors.background).toBe('#fafafa');
  });

  it('ignora valores que no son hex (nunca rompe la app)', () => {
    const { colors } = construirTema({ primary: 'rojo', gold: 'javascript:alert(1)', success: '#12' });
    expect(colors.primary).toBe(Palettes.light.primary);
    expect(colors.secondary).toBe(Palettes.light.secondary);
    expect(colors.success).toBe(Palettes.light.success);
  });

  it('no existe modo oscuro: una sola paleta y el esquema siempre es claro', () => {
    expect(Object.keys(Palettes)).toEqual(['light']);
    expect(ColorSchemeAtLaunch).toBe('light');
  });

  it('el interior usa la paleta oficial suavizada (crema/pastel)', () => {
    expect(Palettes.light.background).toBe('#FBF8F2');
    expect(Palettes.light.surface).toBe('#FFFDF9');
    expect(Palettes.light.primary).toBe('#315B59');
    expect(Palettes.light.secondary).toBe('#C7A66B');
    expect(Palettes.light.text).toBe('#303A38');
  });

  it('el login es oscuro por diseño (petróleo y oro), no por un tema', () => {
    expect(LoginColors.background).toBe('#0D3E43');
    expect(LoginColors.gold).toBe('#C7A66B');
  });
});
