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
 * Paleta final = base (claro/oscuro según el sistema) + colores
 * institucionales de Administración → Configuración → Apariencia
 * (`GET /app/theme`). Solo se aceptan hex válidos. En oscuro NO se pisan
 * fondo/superficie (un fondo claro de la web dejaría texto ilegible): ahí
 * solo cambian los colores de marca.
 */
export function construirTema(scheme: ColorScheme, remoto: AppThemeColors | null | undefined): Tema {
  const base = Palettes[scheme];
  const colors: ColorPalette = { ...base };

  if (remoto) {
    const marca: [keyof ColorPalette, string | undefined][] = [
      ['primary', remoto.primary],
      ['primaryDark', scheme === 'light' ? remoto.primaryAlt : undefined],
      ['secondary', remoto.secondary],
      ['info', remoto.accent ?? remoto.secondary],
      ['rhAccent', remoto.accent ?? remoto.secondary],
      ['success', remoto.success],
      ['danger', remoto.danger],
      ['warning', remoto.gold],
      ['rhInk', remoto.deepGreen ?? remoto.navy],
    ];
    if (scheme === 'light') {
      marca.push(['background', remoto.background], ['surface', remoto.surface], ['textMuted', remoto.muted]);
    }
    for (const [clave, valor] of marca) {
      if (valido(valor)) colors[clave] = valor.trim();
    }
  }

  return { scheme, colors };
}
