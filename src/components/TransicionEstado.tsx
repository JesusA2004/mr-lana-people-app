import { useEffect, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Motion } from '@/constants/motion';

export interface TransicionEstadoProps {
  /** Cambia entre `cargando`, `error`, `contenido`…: cada cambio funde el contenido nuevo. */
  estado: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Fundido corto al alternar cargando / contenido / error, para que la pantalla
 * no salte. El primer render no se anima y con «Reducir movimiento» el cambio
 * es inmediato. No envolver un WebView: el visor de documentos no se anima.
 */
export function TransicionEstado({ estado, children, style }: TransicionEstadoProps) {
  const reducedMotion = useReducedMotion();
  const opacidad = useSharedValue(1);
  const estadoAnterior = useRef(estado);

  useEffect(() => {
    if (estadoAnterior.current === estado) return;
    estadoAnterior.current = estado;
    if (reducedMotion) {
      opacidad.value = 1;
      return;
    }
    opacidad.value = 0;
    opacidad.value = withTiming(1, { duration: Motion.duration.fast, easing: Easing.out(Easing.cubic) });
  }, [estado, opacidad, reducedMotion]);

  const animado = useAnimatedStyle(() => ({ opacity: opacidad.value }));

  return <Animated.View style={[animado, style]}>{children}</Animated.View>;
}
