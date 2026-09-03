/**
 * Sistema de diseño centralizado de MR. LANA PEOPLE.
 *
 * Los valores de marca (primary/secondary) se tomaron de la fuente de verdad
 * del backend Laravel (resources/css/app.css -> --brand-primary / --brand-secondary
 * en https://github.com/JesusA2004/capacitaciones) para que la app móvil
 * comparta identidad visual con la plataforma web.
 *
 * Cambiar la paleta exacta de la marca debe requerir tocar solo este archivo.
 */

export const Colors = {
  background: '#F6FAF8',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F4F2',

  primary: '#4CB838',
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

  overlay: 'rgba(17, 17, 17, 0.5)',
  white: '#FFFFFF',
  black: '#111111',
} as const;

export type ColorToken = keyof typeof Colors;

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

export const Shadow = {
  card: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  raised: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;
