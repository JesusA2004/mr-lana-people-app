import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Motion } from '@/constants/motion';

export interface FadeInViewProps {
  children: React.ReactNode;
  /** Índice usado para escalonar la entrada de listas (fade + translateY). */
  index?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Entrada estándar de tarjetas/secciones: fade + translateY sutil,
 * escalonada por índice. Respeta "Reducir movimiento" del sistema (V4
 * sección 78-79): sin stagger ni translateY, solo un fade corto — la
 * interfaz se mantiene funcional e idéntica en contenido, solo cambia el
 * movimiento.
 */
export function FadeInView({ children, index = 0, style }: FadeInViewProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = withTiming(1, { duration: Motion.duration.fast });
      return;
    }
    progress.value = withDelay(
      Math.min(index, 6) * Motion.stagger,
      withTiming(1, { duration: Motion.duration.base, easing: Easing.out(Easing.cubic) }),
    );
  }, [index, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: reducedMotion ? 0 : (1 - progress.value) * 12 }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
