import { Image } from 'expo-image';

/** Arte oficial de la mascota (oveja con traje, sombrero, monóculo, bastón y moño verde). No redibujar/recortar/deformar. */
const MASCOT_SOURCES = {
  left: require('../../../assets/images/mascot/mascot-left.png'),
  right: require('../../../assets/images/mascot/mascot-right.png'),
} as const;

/** Relación de aspecto real del PNG (827×1100) — evita deformarla al escalarla. */
const MASCOT_ASPECT_RATIO = 827 / 1100;

export type MascotOrientation = 'left' | 'right';
export type MascotSize = 'sm' | 'md' | 'lg';

/** Alturas base por tamaño; el ancho se deriva de MASCOT_ASPECT_RATIO para no deformar la imagen. */
const HEIGHT_BY_SIZE: Record<MascotSize, number> = { sm: 64, md: 104, lg: 216 };

export interface MascotAvatarProps {
  orientation?: MascotOrientation;
  size?: MascotSize;
}

/** Retrato de la mascota oficial de MR. LANA PEOPLE. */
export function MascotAvatar({ orientation = 'right', size = 'md' }: MascotAvatarProps) {
  const height = HEIGHT_BY_SIZE[size];
  const width = Math.round(height * MASCOT_ASPECT_RATIO);

  return (
    <Image
      source={MASCOT_SOURCES[orientation]}
      style={{ width, height }}
      contentFit="contain"
      accessibilityLabel="Mascota de MR. LANA PEOPLE"
      accessibilityIgnoresInvertColors
    />
  );
}
