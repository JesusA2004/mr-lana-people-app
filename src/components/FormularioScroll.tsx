import { forwardRef } from 'react';
import { Platform, StyleSheet, type ScrollViewProps } from 'react-native';
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

/**
 * Cerrar el teclado al arrastrar: en iOS el teclado sigue al dedo
 * (`interactive`); Android no soporta ese modo, ahí se cierra al deslizar.
 */
export const MODO_CIERRE_TECLADO: ScrollViewProps['keyboardDismissMode'] = Platform.OS === 'ios' ? 'interactive' : 'on-drag';

export interface FormularioScrollProps extends ScrollViewProps {
  /** Alto de la barra inferior (si la pantalla tiene una), ver `BarraAccionInferior.onAltura`. */
  alturaBarra?: number;
  children?: React.ReactNode;
}

/**
 * Scroll de TODA pantalla con campos de texto: el input enfocado nunca queda
 * tapado por el teclado (KeyboardAwareScrollView de
 * react-native-keyboard-controller, la solución recomendada para Expo SDK 57
 * y compatible con Expo Go). Sigue también al caret de los campos
 * multilínea mientras se escribe. En web/jest cae en un ScrollView normal.
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
      keyboardDismissMode={MODO_CIERRE_TECLADO}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      {...rest}>
      {children}
    </KeyboardAwareScrollView>
  );
});

/**
 * Para listas (`FlatList`/`SectionList`) con un campo de texto dentro (p. ej.
 * el mensaje de una celebración en el encabezado de la lista):
 *
 * ```tsx
 * <FlatList renderScrollComponent={renderScrollConTeclado} … />
 * ```
 *
 * La lista conserva la virtualización y el campo enfocado sube sobre el teclado.
 */
export function renderScrollConTeclado(props: ScrollViewProps) {
  return <KeyboardAwareScrollView bottomOffset={ESPACIO_SOBRE_TECLADO} keyboardShouldPersistTaps="handled" keyboardDismissMode={MODO_CIERRE_TECLADO} {...props} />;
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
});
