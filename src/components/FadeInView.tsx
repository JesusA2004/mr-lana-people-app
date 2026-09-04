import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Motion } from '@/constants/motion';

export interface FadeInViewProps {
  children: React.ReactNode;
  /** Índice usado para escalonar la entrada de listas (fade + translateY). */
  index?: number;
  style?: StyleProp<ViewStyle>;
}

/** Entrada estándar de tarjetas/secciones: fade + translateY sutil, escalonada por índice. */
export function FadeInView({ children, index = 0, style }: FadeInViewProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      Math.min(index, 6) * Motion.stagger,
      withTiming(1, { duration: Motion.duration.base, easing: Easing.out(Easing.cubic) }),
    );
  }, [index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 12 }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
