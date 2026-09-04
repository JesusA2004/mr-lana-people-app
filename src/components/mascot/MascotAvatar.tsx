import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

/**
 * TODO(mascot-art): las dos imágenes oficiales de la mascota
 * (assets/images/mascot/mascot-left.png / mascot-right.png, ver README en
 * esa carpeta) no llegaron adjuntas todavía. En cuanto existan en disco:
 *
 *   1. Cambia esta constante a `true`.
 *   2. Descomenta los `require(...)` de abajo.
 *
 * Mientras tanto se usa una insignia con emoji en colores de marca — un
 * placeholder neutro, nunca un rediseño de la mascota real (AGENTS.md §4
 * prohíbe redibujarla/deformarla).
 */
const MASCOT_ART_READY = false;

// const MASCOT_SOURCES = {
//   left: require('../../../assets/images/mascot/mascot-left.png'),
//   right: require('../../../assets/images/mascot/mascot-right.png'),
// } as const;

export type MascotOrientation = 'left' | 'right';
export type MascotSize = 'sm' | 'md' | 'lg';

const DIMENSIONS: Record<MascotSize, number> = { sm: 40, md: 56, lg: 88 };
const EMOJI_SIZE: Record<MascotSize, number> = { sm: 20, md: 28, lg: 44 };

export interface MascotAvatarProps {
  orientation?: MascotOrientation;
  size?: MascotSize;
}

/** Retrato de la mascota oficial (o su placeholder mientras se recibe el arte final). */
export function MascotAvatar({ orientation = 'right', size = 'md' }: MascotAvatarProps) {
  const dimension = DIMENSIONS[size];

  if (MASCOT_ART_READY) {
    return (
      <Image
        // source={MASCOT_SOURCES[orientation]}
        style={{ width: dimension, height: dimension }}
        contentFit="contain"
        accessibilityLabel="Mascota de MR. LANA PEOPLE"
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: dimension, height: dimension, borderRadius: dimension / 2, transform: [{ scaleX: orientation === 'left' ? -1 : 1 }] },
      ]}
      accessibilityLabel="Mascota de MR. LANA PEOPLE"
      accessibilityRole="image">
      <Text style={{ fontSize: EMOJI_SIZE[size], transform: [{ scaleX: orientation === 'left' ? -1 : 1 }] }}>🐑</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: Colors.primarySoft,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
