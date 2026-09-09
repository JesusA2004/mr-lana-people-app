import { Pressable, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Motion } from '@/constants/motion';
import { haptics } from '@/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Vibración ligera al presionar. Desactívala en listas largas o acciones muy frecuentes. */
  haptic?: boolean;
  accessibilityRole?: 'button' | 'link' | 'none';
  accessibilityLabel?: string;
  hitSlop?: number;
  /** Color del ripple nativo de Android (además del scale) — solo cuando conviene, ej. filas de lista sobre fondo plano. No aplica en iOS. */
  rippleColor?: string;
}

/**
 * Envoltura estándar para feedback táctil en móvil (no existen hover states
 * reales — ver AGENTS.md sección 13): escala sutil al presionar + haptic
 * opcional. Úsala en vez de <Pressable> plano para cualquier tarjeta, chip o
 * acción tocable que deba sentirse "premium".
 */
export function PressableScale({
  children,
  onPress,
  disabled = false,
  style,
  haptic = true,
  accessibilityRole = 'button',
  accessibilityLabel,
  hitSlop,
  rippleColor,
}: PressableScaleProps) {
  'use no memo';
  // El React Compiler (habilitado en app.json) no reconoce todavía el
  // patrón de Reanimated de mutar `.value` en un shared value: la directiva
  // de arriba lo excluye de la memoización automática en tiempo de build,
  // pero el lint estático `react-hooks/immutability` no la respeta (revisa
  // el AST sin saber de esta convención de Reanimated), así que se
  // silencia explícitamente línea por línea — es el patrón oficial de
  // Reanimated, no un descuido.
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    // eslint-disable-next-line react-hooks/immutability -- mutación de shared value de Reanimated, patrón esperado.
    scale.value = withTiming(Motion.scale.pressed, { duration: Motion.duration.press });
  }

  function handlePressOut() {
    // eslint-disable-next-line react-hooks/immutability -- mutación de shared value de Reanimated, patrón esperado.
    scale.value = withTiming(1, { duration: Motion.duration.press });
  }

  function handlePress(event: GestureResponderEvent) {
    if (disabled) return;
    if (haptic) haptics.tap();
    onPress?.();
    void event;
  }

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={hitSlop}
      android_ripple={rippleColor ? { color: rippleColor } : undefined}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style, disabled && { opacity: 0.5 }]}>
      {children}
    </AnimatedPressable>
  );
}
