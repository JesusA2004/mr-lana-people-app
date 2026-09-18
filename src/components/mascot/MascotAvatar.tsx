import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Shadow } from '@/constants/colors';

/** Insignia de marca (logo-mark) — ya no la oveja: "no la usaremos como avatar". */
const LOGO_SOURCE = require('../../../assets/images/brand/logo-mark.png');

export type MascotOrientation = 'left' | 'right';
export type MascotSize = 'sm' | 'md' | 'lg';

/** Diámetro del badge circular por tamaño. */
const DIAMETER_BY_SIZE: Record<MascotSize, number> = { sm: 56, md: 88, lg: 160 };

/** Inclinación estática leve para dar variedad de composición sin cambiar de imagen. */
const TILT_BY_ORIENTATION: Record<MascotOrientation, number> = { left: -6, right: 6 };

export interface MascotAvatarProps {
  orientation?: MascotOrientation;
  size?: MascotSize;
}

/**
 * Insignia animada del "asistente" de MR. LANA PEOPLE: el logo-mark de la
 * marca dentro de un badge circular con halo respirando y flotación sutil
 * (Reanimated, loop infinito, se detiene con "Reducir movimiento"). Sustituye
 * a la mascota-oveja anterior por pedido explícito ("no la usaremos como
 * avatar") — sin arte nuevo, reutiliza `assets/images/brand/logo-mark.png`.
 */
export function MascotAvatar({ orientation = 'right', size = 'md' }: MascotAvatarProps) {
  const reducedMotion = useReducedMotion();
  const diameter = DIAMETER_BY_SIZE[size];
  const glowDiameter = diameter * 1.55;
  const float = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [reducedMotion, float, glow]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -float.value * 4 }, { rotate: `${TILT_BY_ORIENTATION[orientation]}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.14 + glow.value * 0.16,
    transform: [{ scale: 1 + glow.value * 0.08 }],
  }));

  return (
    <View
      style={[styles.container, { width: diameter, height: diameter }]}
      accessibilityLabel="Asistente de MR. LANA PEOPLE"
      accessible>
      <Animated.View
        style={[
          styles.glow,
          { width: glowDiameter, height: glowDiameter, borderRadius: glowDiameter / 2 },
          !reducedMotion && glowStyle,
        ]}
      />
      <Animated.View
        style={[styles.badge, { width: diameter, height: diameter, borderRadius: diameter / 2 }, !reducedMotion && floatStyle]}>
        <Image
          source={LOGO_SOURCE}
          style={{ width: diameter * 0.56, height: diameter * 0.56 }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: Colors.primary,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    ...Shadow.sm,
  },
});
