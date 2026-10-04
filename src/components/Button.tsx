import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { Motion } from '@/constants/motion';
import { crearGuardiaDobleToque } from '@/utils/dobleToque';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

function colorTexto(Colors: ColorPalette, variant: ButtonVariant): string {
  // Texto sobre fondo transparente: `primaryDark` contrasta mejor que `primary` en claro y oscuro.
  return variant === 'outline' || variant === 'ghost' ? Colors.primaryDark : Colors.white;
}

export interface ButtonProps {
  title: string;
  /** Si devuelve una promesa, el botón queda ocupado hasta que termine (sin doble envío). */
  onPress: () => void | Promise<unknown>;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Ícono a la izquierda del texto (Ionicons). Se oculta durante `loading` para no competir con el spinner. */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Ícono a la derecha del texto (Ionicons). */
  rightIcon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Botón base de toda la app. `loading` nunca cambia el ancho del botón: el
 * contenido (texto + íconos) se mantiene en el layout pero invisible
 * (`opacity: 0`) mientras el spinner se dibuja encima, así el botón no
 * "salta" al activarse/desactivarse el loading.
 *
 * Feedback de press: mismo scale sutil que `PressableScale` (Motion.scale.pressed),
 * desactivado con "Reducir movimiento".
 */
export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, fullWidth = true, style, leftIcon, rightIcon }: ButtonProps) {
  'use no memo';
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const variantStyles = useEstilos(crearEstilosVariante);
  const variantLabelStyles = useEstilos(crearEstilosEtiqueta);
  // Doble toque: nunca dos envíos de la misma acción (ver utils/dobleToque).
  const guardia = useRef(crearGuardiaDobleToque()).current;
  const [ocupado, setOcupado] = useState(false);
  const isDisabled = disabled || loading || ocupado;
  const labelColor = colorTexto(Colors, variant);
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    if (isDisabled || reducedMotion) return;
    // eslint-disable-next-line react-hooks/immutability -- mutación de shared value de Reanimated, patrón esperado.
    scale.value = withTiming(Motion.scale.pressed, {
      duration: Motion.duration.press,
    });
  }

  function handlePressOut() {
    if (reducedMotion) return;
    // eslint-disable-next-line react-hooks/immutability -- mutación de shared value de Reanimated, patrón esperado.
    scale.value = withTiming(1, { duration: Motion.duration.press });
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading || ocupado }}
      onPress={() => {
        if (isDisabled) return;
        guardia.ejecutar(onPress, () => setOcupado(false));
        if (guardia.ocupado) setOcupado(true);
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[styles.base, variantStyles[variant], fullWidth && styles.fullWidth, isDisabled && styles.disabled, style, animatedStyle]}>
      <View style={[styles.content, (loading || ocupado) && styles.contentHidden]}>
        {leftIcon ? <Ionicons name={leftIcon} size={18} color={labelColor} /> : null}
        <Text style={[styles.label, variantLabelStyles[variant]]} numberOfLines={2}>
          {title}
        </Text>
        {rightIcon ? <Ionicons name={rightIcon} size={18} color={labelColor} /> : null}
      </View>
      {loading || ocupado ? (
        <View style={styles.spinnerOverlay} pointerEvents="none">
          <ActivityIndicator color={labelColor} />
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    base: {
      minHeight: 52,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
    },
    fullWidth: {
      alignSelf: 'stretch',
    },
    disabled: {
      opacity: 0.5,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      maxWidth: '100%',
    },
    contentHidden: {
      opacity: 0,
    },
    spinnerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      // En 320 px o con texto grande el título baja a 2 líneas en vez de cortarse.
      flexShrink: 1,
      textAlign: 'center',
      fontSize: FontSize.md,
      fontWeight: '700',
    },
  });

const crearEstilosVariante = (Colors: ColorPalette) =>
  StyleSheet.create({
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Colors.danger,
  },
});

const crearEstilosEtiqueta = (Colors: ColorPalette) =>
  StyleSheet.create({
  primary: { color: Colors.white },
  secondary: { color: Colors.white },
  outline: { color: Colors.primaryDark },
  ghost: { color: Colors.primaryDark },
  danger: { color: Colors.white },
});
