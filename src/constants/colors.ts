import { Appearance } from 'react-native';

/**
 * Sistema de diseño centralizado de MR. LANA PEOPLE.
 *
 * Los valores de marca (primary/secondary) se tomaron de la fuente de verdad
 * del backend Laravel (resources/css/app.css -> --brand-primary / --brand-secondary
 * en https://github.com/JesusA2004/capacitaciones) para que la app móvil
 * comparta identidad visual con la plataforma web.
 *
 * Modo oscuro (app.json `userInterfaceStyle: automatic`): la paleta se
 * resuelve UNA vez al arrancar según el tema del sistema, antes de que
 * cualquier `StyleSheet.create` la lea — por eso toda la app (incluidos los
 * estilos estáticos) queda en el mismo tema y nunca "mitad oscura / mitad
 * clara". `_layout.tsx` fija además la apariencia nativa (Alert, pickers,
 * teclado) a ese mismo esquema; un cambio de tema del sistema con la app
 * abierta se aplica en la siguiente apertura. Documentado en
 * docs/UI_UX_SYSTEM.md.
 *
 * Cambiar la paleta exacta de la marca debe requerir tocar solo este archivo.
 */

export type ColorScheme = 'light' | 'dark';

const LightColors = {
  background: '#F6FAF8',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F4F2',
  /** Superficie elevada sobre `surface` (sheets, menús). */
  surfaceRaised: '#FFFFFF',

  primary: '#4CB838',
  /** Verde de marca para TEXTO/íconos sobre superficies claras o `primarySoft`. */
  primaryDark: '#3C9A2C',
  primarySoft: '#E4F5E0',

  secondary: '#2DC7D3',
  secondarySoft: '#E0F7F8',

  text: '#111111',
  textMuted: '#6B7280',
  textInverse: '#FFFFFF',

  border: '#E7EAE8',
  divider: '#EDEDED',

  success: '#1CA64F',
  successSoft: '#E3F6EA',
  warning: '#CB8400',
  warningSoft: '#FCF0DA',
  danger: '#EF4444',
  dangerSoft: '#FDEAEA',
  info: '#2DC7D3',
  infoSoft: '#E0F7F8',

  neutral: '#6B7280',
  neutralSoft: '#EEF0F1',

  /**
   * Acento de celebración (cumpleaños, felicitaciones). Existe para poder
   * traducir el color `celebracion` de la paleta cerrada de notificaciones
   * (`NotificacionesService::ESTILOS`) a un token propio, en vez de pintar
   * el hexadecimal que manda el backend.
   */
  celebration: '#D4457F',
  celebrationSoft: '#FCE7F0',

  /**
   * Identidad "Gestión RH": tinta verde profunda (derivada del verde de
   * marca) + neutros, con el cian de marca como acento discreto. Hace que la
   * experiencia administrativa se sienta distinta de Mi espacio sin
   * convertirse en otra marca. Ver `RhIdentityBadge`.
   */
  rhInk: '#12352C',
  rhInkSoft: '#E3EEEA',
  rhAccent: '#2DC7D3',
  /** Texto/ícono sobre `rhInk`. */
  onRhInk: '#FFFFFF',

  /** Barra/aviso de alto contraste (banner offline). */
  inverseSurface: '#1B211E',
  onInverseSurface: '#FFFFFF',
  /** Marca de agua de documentos sensibles. */
  watermark: 'rgba(17, 17, 17, 0.06)',
  skeleton: '#E6ECE9',
  skeletonHighlight: '#F3F6F5',

  overlay: 'rgba(17, 17, 17, 0.5)',
  /** Primer plano sobre color sólido (botón primario, badge). Constante en ambos temas. */
  white: '#FFFFFF',
  /** Fondo de medios (cámara, visor de PDF). Constante en ambos temas. */
  black: '#111111',
};

export type ColorPalette = { [K in keyof typeof LightColors]: string };

const DarkColors: ColorPalette = {
  background: '#0E1311',
  surface: '#161C19',
  surfaceMuted: '#1E2622',
  surfaceRaised: '#1C2420',

  primary: '#52BF3E',
  primaryDark: '#7FD36D',
  primarySoft: '#1B3317',

  secondary: '#2DC7D3',
  secondarySoft: '#123236',

  text: '#ECF1EE',
  textMuted: '#9BA7A2',
  textInverse: '#111111',

  border: '#2A3430',
  divider: '#252E2A',

  success: '#23B35A',
  successSoft: '#15311F',
  warning: '#E0A12A',
  warningSoft: '#352812',
  danger: '#F05A5A',
  dangerSoft: '#3A1B1B',
  info: '#38CDD8',
  infoSoft: '#123236',

  neutral: '#9BA7A2',
  neutralSoft: '#222A27',

  celebration: '#E2679A',
  celebrationSoft: '#3A1B29',

  rhInk: '#1D4A3E',
  rhInkSoft: '#17302A',
  rhAccent: '#38CDD8',
  onRhInk: '#FFFFFF',

  inverseSurface: '#E4EAE7',
  onInverseSurface: '#111111',
  watermark: 'rgba(255, 255, 255, 0.05)',
  skeleton: '#222B27',
  skeletonHighlight: '#2B3531',

  overlay: 'rgba(0, 0, 0, 0.62)',
  white: '#FFFFFF',
  black: '#0A0A0A',
};

function resolveScheme(): ColorScheme {
  try {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Esquema con el que arrancó la app (fijo durante toda la sesión, ver comentario arriba). */
export const ColorSchemeAtLaunch: ColorScheme = resolveScheme();

export const Colors: ColorPalette = ColorSchemeAtLaunch === 'dark' ? DarkColors : LightColors;

/** Paletas completas — solo para la pantalla `__DEV__` Design QA (comparar ambos temas lado a lado). */
export const Palettes: Record<ColorScheme, ColorPalette> = { light: LightColors, dark: DarkColors };

export type ColorToken = keyof ColorPalette;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
} as const;

/**
 * Compatible Android (elevation) / iOS (shadow*). Tres niveles nada más — no
 * inventar sombras nuevas por pantalla. En oscuro la sombra casi no se ve:
 * la jerarquía la dan `border` y `surfaceRaised`.
 */
const shadowOpacityScale = ColorSchemeAtLaunch === 'dark' ? 2.5 : 1;
export const Shadow = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04 * shadowOpacityScale,
    shadowRadius: 6,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06 * shadowOpacityScale,
    shadowRadius: 12,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1 * shadowOpacityScale,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

/**
 * Ancho máximo del contenido (tablet / teléfonos grandes en horizontal):
 * nunca cards de 800 px. Las pantallas centran su contenido con este tope.
 */
export const Layout = {
  maxContentWidth: 720,
  /** Formularios: ancho de lectura cómodo. */
  maxFormWidth: 560,
  /** A partir de este ancho de ventana, los dashboards pasan a 2 columnas. */
  twoColumnBreakpoint: 600,
  /** Área táctil mínima (Apple HIG 44pt / Material 48dp). */
  minTouchTarget: 44,
} as const;
