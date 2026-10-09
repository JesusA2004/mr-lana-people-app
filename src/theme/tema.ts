import { Palettes, type ColorPalette, type ColorScheme } from '@/constants/colors';
import type { AppThemeColors } from '@/types/theme';

export interface Tema {
  scheme: ColorScheme;
  colors: ColorPalette;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function valido(valor: string | undefined): valor is string {
  return typeof valor === 'string' && HEX.test(valor.trim());
}

/**
 * Paleta final = base clara (la app no tiene modo oscuro) + colores
 * institucionales de Administración → Configuración → Apariencia
 * (`GET /app/theme`). Solo se aceptan hex válidos. El gris verdoso de
 * Apariencia no se usa como texto secundario: no alcanza contraste sobre
 * el fondo crema.
 */
export function construirTema(remoto: AppThemeColors | null | undefined): Tema {
  const colors: ColorPalette = { ...Palettes.light };

  if (remoto) {
    const marca: [keyof ColorPalette, string | undefined][] = [
      ['primary', remoto.primary],
      ['primaryDark', remoto.primaryAlt],
      ['secondary', remoto.gold ?? remoto.secondary],
      ['info', remoto.accent ?? remoto.navy],
      ['rhAccent', remoto.gold ?? remoto.accent],
      ['success', remoto.success],
      ['danger', remoto.danger],
      // Bronce: el oro claro no se lee como texto de advertencia.
      ['warning', remoto.goldDark ?? remoto.gold],
      ['rhInk', remoto.deepGreen ?? remoto.navy],
      ['background', remoto.background],
      ['surface', remoto.surface],
    ];
    for (const [clave, valor] of marca) {
      if (valido(valor)) colors[clave] = valor.trim();
    }
  }

  return { scheme: 'light', colors };
}
