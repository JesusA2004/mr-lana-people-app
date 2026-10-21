import { forwardRef } from 'react';
import { StyleSheet, type ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';

import { Spacing } from '@/constants/colors';

/** Espacio mínimo entre el campo enfocado y el teclado. */
export const ESPACIO_SOBRE_TECLADO = Spacing.xl;

/**
 * `bottomOffset` para el scroll: si hay una `BarraAccionInferior` pegada al
 * teclado, el campo activo debe quedar ARRIBA de la barra (no solo arriba
 * del teclado).
 */
export function offsetCampoActivo(alturaBarra: number): number {
  return Math.max(0, alturaBarra) + ESPACIO_SOBRE_TECLADO;
}

export interface FormularioScrollProps extends ScrollViewProps {
  /** Alto de la barra inferior (si la pantalla tiene una), ver `BarraAccionInferior.onAltura`. */
  alturaBarra?: number;
  children?: React.ReactNode;
}

/**
 * Scroll de TODA pantalla con campos de texto: el input enfocado nunca queda
 * tapado por el teclado (KeyboardAwareScrollView de
 * react-native-keyboard-controller, la solución recomendada para Expo SDK 57
 * y compatible con Expo Go). En web/jest cae en un ScrollView normal.
 */
export const FormularioScroll = forwardRef<KeyboardAwareScrollViewRef, FormularioScrollProps>(function FormularioScroll(
  { alturaBarra = 0, contentContainerStyle, children, ...rest },
  ref,
) {
  return (
    <KeyboardAwareScrollView
      ref={ref}
      bottomOffset={offsetCampoActivo(alturaBarra)}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={[styles.content, contentContainerStyle]}
      {...rest}>
      {children}
    </KeyboardAwareScrollView>
  );
});

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
});
