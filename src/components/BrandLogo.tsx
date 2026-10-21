import { Image } from 'expo-image';
import { StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

import { APP_NAME } from '@/constants/config';

/**
 * Logo OFICIAL de MR. LANA PEOPLE (capacitaciones/docs/formatosRH/png):
 *
 * - `horizontal` → `MrLanaPeople_horizontal_color` (símbolo + «Mr. Lana
 *   PEOPLE Contigo»), recortado sin márgenes. Es el que va donde antes se
 *   escribía «MR. LANA PEOPLE» a mano (login, registro por QR, bienvenida).
 * - `negativo` → misma pieza en negativo, solo sobre fondos oscuros (visor,
 *   cámara). La app es de tema claro: casi nunca hace falta.
 * - `simbolo` → el ícono cuadrado de la app (logo-mark): avatares, splash,
 *   pantallas de bloqueo donde no cabe el horizontal.
 *
 * Nunca escribas la marca como texto suelto: usa este componente.
 */
export type BrandLogoVariant = 'horizontal' | 'negativo' | 'simbolo';

/** Relación ancho/alto real de los PNG (1200×252 recortados). */
export const LOGO_HORIZONTAL_RATIO = 1200 / 252;

const FUENTES = {
  horizontal: require('@/assets/images/brand/logo-horizontal.png'),
  negativo: require('@/assets/images/brand/logo-horizontal-negativo.png'),
  simbolo: require('@/assets/images/brand/logo-mark.png'),
} as const;

export interface BrandLogoProps {
  variant?: BrandLogoVariant;
  /** Ancho en dp (el alto sale de la proporción real del archivo). */
  width?: number;
  style?: StyleProp<ImageStyle>;
  /** Por defecto lo lee el lector de pantalla como «Mr. Lana People». */
  accessibilityLabel?: string;
}

export function alturaLogo(variant: BrandLogoVariant, width: number): number {
  return variant === 'simbolo' ? width : Math.round(width / LOGO_HORIZONTAL_RATIO);
}

export function BrandLogo({ variant = 'horizontal', width = 240, style, accessibilityLabel = APP_NAME }: BrandLogoProps) {
  return (
    <Image
      source={FUENTES[variant]}
      style={[styles.base, { width, height: alturaLogo(variant, width) }, style]}
      contentFit="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'center',
  },
});
