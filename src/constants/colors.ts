/**
 * Sistema de diseño centralizado de MR. LANA PEOPLE.
 *
 * SOLO CLARO: la app no tiene modo oscuro y nunca sigue la configuración
 * claro/oscuro de Android/iOS (app.json `userInterfaceStyle: light`). El
 * interior usa la paleta oficial suavizada — crema, salvia, menta, olivo
 * claro y oro suave — igual que la web (resources/css/app.css del
 * backend). Desde 2026-10-15 el LOGIN también es claro/crema (usa esta
 * misma paleta `LightColors`); ya no existe ninguna pantalla oscura.
 *
 * Administración → Apariencia puede ajustar los colores de marca (ver
 * `src/theme/tema.ts`). Cambiar la paleta exacta de la marca debe requerir
 * tocar solo este archivo.
 */

export type ColorScheme = 'light';

const LightColors = {
  background: '#FBF8F2',
  surface: '#FFFDF9',
  surfaceMuted: '#F5EFE4',
  /** Superficie elevada sobre `surface` (sheets, menús). */
  surfaceRaised: '#FFFDF9',

  /** Petróleo suavizado: botones principales, encabezados. */
  primary: '#315B59',
  /** Tono más profundo para TEXTO/íconos de marca sobre fondos claros o `primarySoft`. */
  primaryDark: '#284B49',
  /** Menta: fondo suave de marca. */
  primarySoft: '#E8F0EA',

  /** Oro suave: acento. */
  secondary: '#C7A66B',
  /** Crema. */
  secondarySoft: '#F3E8D3',

  text: '#303A38',
  textMuted: '#707874',
  textInverse: '#FFFDF9',

  border: '#E7DED1',
  divider: '#EDE5D8',

  success: '#3F7558',
  successSoft: '#DCEBDD',
  /** Bronce legible sobre `warningSoft`. */
  warning: '#8A6A36',
  warningSoft: '#F6EACB',
  danger: '#B0524A',
  dangerSoft: '#F5DDDA',
  info: '#3D6F71',
  infoSoft: '#DDEBEC',

  neutral: '#707874',
  neutralSoft: '#EFE9DF',

  /**
   * Acento de celebración (cumpleaños, felicitaciones). Existe para poder
   * traducir el color `celebracion` de la paleta cerrada de notificaciones
   * (`NotificacionesService::ESTILOS`) a un token propio, en vez de pintar
   * el hexadecimal que manda el backend.
   */
  celebration: '#B65D80',
  celebrationSoft: '#F6E3EB',

  /**
   * Identidad "Gestión RH": petróleo suavizado + salvia, con el oro como
   * acento discreto. Hace que la experiencia administrativa se sienta
   * distinta de Mi espacio sin convertirse en otra marca. Ver `RhIdentityBadge`.
   */
  rhInk: '#315B59',
  rhInkSoft: '#DCE8DF',
  rhAccent: '#C7A66B',
  /** Texto/ícono sobre `rhInk`. */
  onRhInk: '#FFFDF9',

  /** Barra/aviso de alto contraste (banner offline). */
  inverseSurface: '#303A38',
  onInverseSurface: '#FFFDF9',
  /** Marca de agua de documentos sensibles. */
  watermark: 'rgba(48, 58, 56, 0.06)',
  skeleton: '#EFE7DA',
  skeletonHighlight: '#F8F3EA',

  overlay: 'rgba(48, 58, 56, 0.45)',
  /** Primer plano sobre color sólido (botón primario, badge). */
  white: '#FFFFFF',
  /** Fondo de medios (cámara, visor de PDF). */
  black: '#111111',
};

export type ColorPalette = { [K in keyof typeof LightColors]: string };

/** Esquema único de la app (fijo: no hay modo oscuro). */
export const ColorSchemeAtLaunch: ColorScheme = 'light';

export const Colors: ColorPalette = LightColors;

/** Paleta completa — para la pantalla `__DEV__` Design QA. */
export const Palettes: Record<ColorScheme, ColorPalette> = { light: LightColors };

/**
 * LEGACY (2026-10-15): paleta oscura que usaba el login anterior (petróleo
 * profundo, oro y crema). El login ahora es claro/crema y usa `LightColors`
 * como el resto de la app, así que estos tokens ya no se consumen en la UI.
 * Se conserva por compatibilidad (lo referencia `tema.test.ts`); no la uses
 * en pantallas nuevas.
 */
export const LoginColors = {
  background: '#0D3E43',
  backgroundAlt: '#174A4A',
  gold: '#C7A66B',
  cream: '#E9D6B0',
  text: '#FFFDF9',
  textMuted: 'rgba(255, 253, 249, 0.72)',
  divider: 'rgba(233, 214, 176, 0.25)',
  qrBackground: 'rgba(199, 166, 107, 0.16)',
} as const;

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
 * Interlineado de cada tamaño de `FontSize` (≈ 1.35–1.45×). Úsalo junto con
 * el tamaño para que los párrafos respiren y, con letra grande de
 * accesibilidad, el renglón escale sin encimarse (RN escala `lineHeight` con
 * `fontScale` igual que `fontSize`).
 */
export const LineHeight = {
  xs: 17,
  sm: 19,
  md: 22,
  lg: 24,
  xl: 28,
  xxl: 32,
  xxxl: 38,
} as const;

/**
 * Escala tipográfica (presets listos para `StyleSheet`): un solo lugar para
 * la jerarquía de textos. Sin color (cada pantalla elige `text`/`textMuted`).
 *
 * ```ts
 * titulo: { ...Typography.title, color: Colors.text }
 * ```
 */
export const Typography = {
  /** Hero / número grande. */
  display: { fontSize: FontSize.xxxl, lineHeight: LineHeight.xxxl, fontWeight: '800' },
  /** Título de pantalla. */
  title: { fontSize: FontSize.xxl, lineHeight: LineHeight.xxl, fontWeight: '800' },
  /** Encabezado de sección / tarjeta destacada. */
  headline: { fontSize: FontSize.xl, lineHeight: LineHeight.xl, fontWeight: '800' },
  /** Título de tarjeta o fila. */
  subtitle: { fontSize: FontSize.lg, lineHeight: LineHeight.lg, fontWeight: '700' },
  /** Texto de lectura. */
  body: { fontSize: FontSize.md, lineHeight: LineHeight.md, fontWeight: '400' },
  /** Texto de lectura con énfasis. */
  bodyStrong: { fontSize: FontSize.md, lineHeight: LineHeight.md, fontWeight: '700' },
  /** Etiquetas de campo, metadatos. */
  label: { fontSize: FontSize.sm, lineHeight: LineHeight.sm, fontWeight: '700' },
  /** Notas, ayudas, fechas. */
  caption: { fontSize: FontSize.xs, lineHeight: LineHeight.xs, fontWeight: '500' },
  /** Sobretítulo en mayúsculas. */
  overline: { fontSize: FontSize.xs, lineHeight: LineHeight.xs, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
} as const;

/**
 * Compatible Android (elevation) / iOS (shadow*). Tres niveles nada más — no
 * inventar sombras nuevas por pantalla. Sombra cálida y mínima.
 */
const shadowOpacityScale = 1;
export const Shadow = {
  sm: {
    shadowColor: '#303A38',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04 * shadowOpacityScale,
    shadowRadius: 6,
    elevation: 1,
  },
  md: {
    shadowColor: '#303A38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06 * shadowOpacityScale,
    shadowRadius: 12,
    elevation: 2,
  },
  lg: {
    shadowColor: '#303A38',
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
