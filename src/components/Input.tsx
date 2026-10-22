import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardController } from 'react-native-keyboard-controller';

import { FontSize, Layout, LineHeight, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';

export interface InputProps extends TextInputProps {
  /** Etiqueta visible. Opcional: sin ella usa `accessibilityLabel`/`placeholder` para lectores de pantalla. */
  label?: string;
  error?: string;
  secureToggle?: boolean;
  /** Texto de ayuda debajo del campo (lo reemplaza el error cuando hay). */
  hint?: string;
  /** Contador `n/maxLength`. Por defecto visible en campos multilínea con `maxLength`. */
  showCounter?: boolean;
  /** Ícono a la izquierda (Ionicons). */
  leftIcon?: keyof typeof Ionicons.glyphMap;
}

type EventoFoco = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
type EventoBlur = Parameters<NonNullable<TextInputProps['onBlur']>>[0];

/** Alto máximo de un campo multilínea antes de hacer scroll interno (crece con el texto hasta aquí). */
export const ALTURA_MAX_MULTILINEA = 220;
/** Alto mínimo de un campo multilínea (≈ 4 renglones). */
export const ALTURA_MIN_MULTILINEA = 112;

/**
 * ¿El campo debe encadenar el foco al siguiente al presionar «Siguiente» del
 * teclado? Solo campos de una línea a los que la pantalla no les dio su
 * propio `onSubmitEditing` ni otra tecla de retorno.
 */
export function debeEncadenarFoco(props: Pick<TextInputProps, 'multiline' | 'onSubmitEditing' | 'returnKeyType'>): boolean {
  return !props.multiline && props.onSubmitEditing === undefined && (props.returnKeyType === undefined || props.returnKeyType === 'next');
}

/**
 * Campo de formulario reutilizable (label + input + ayuda/error), usado con
 * React Hook Form.
 *
 * - Anillo de foco en color de marca; error en rojo y anunciado al lector de pantalla.
 * - «Siguiente» del teclado salta al siguiente campo de la pantalla
 *   (`KeyboardController.setFocusTo('next')`); en el último campo cierra el teclado.
 *   Si la pantalla pasa su propio `onSubmitEditing`/`returnKeyType`, se respeta.
 * - Multilínea: crece con el texto (112 → 220 dp) y el caret queda visible
 *   sobre el teclado (lo resuelve `FormularioScroll`).
 * - Sin altos fijos: con letra grande de accesibilidad el campo crece, no corta.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    secureToggle = false,
    secureTextEntry,
    hint,
    showCounter,
    leftIcon,
    style,
    multiline,
    maxLength,
    editable = true,
    onFocus,
    onBlur,
    onSubmitEditing,
    returnKeyType,
    submitBehavior,
    accessibilityLabel,
    ...rest
  },
  ref,
) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const inputRef = useRef<TextInput>(null);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const [enfocado, setEnfocado] = useState(false);

  useImperativeHandle(ref, () => inputRef.current as TextInput, []);

  const encadenar = debeEncadenarFoco({ multiline, onSubmitEditing, returnKeyType });
  const longitud = typeof rest.value === 'string' ? rest.value.length : 0;
  const mostrarContador = maxLength !== undefined && (showCounter ?? Boolean(multiline));
  const nota = error ?? hint;

  const alEnfocar = (event: EventoFoco) => {
    setEnfocado(true);
    onFocus?.(event);
  };
  const alDesenfocar = (event: EventoBlur) => {
    setEnfocado(false);
    onBlur?.(event);
  };
  const alSiguiente = () => {
    KeyboardController.setFocusTo('next');
    // Último campo de la pantalla: no hay a dónde saltar → se cierra el teclado.
    setTimeout(() => {
      if (inputRef.current?.isFocused()) void KeyboardController.dismiss();
    }, 150);
  };

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label} onPress={() => inputRef.current?.focus()} suppressHighlighting accessible={false}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          multiline && styles.inputWrapperMultiline,
          enfocado && styles.inputWrapperFocused,
          !editable && styles.inputWrapperDisabled,
          error ? styles.inputWrapperError : null,
        ]}>
        {leftIcon ? (
          <Ionicons name={leftIcon} size={20} color={enfocado ? Colors.primaryDark : Colors.textMuted} style={multiline ? styles.iconMultiline : undefined} />
        ) : null}
        <TextInput
          ref={inputRef}
          style={[styles.input, multiline && styles.inputMultiline, !editable && styles.inputDisabled, style]}
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.primary}
          cursorColor={Colors.primary}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          multiline={multiline}
          maxLength={maxLength}
          editable={editable}
          textAlignVertical={multiline ? 'top' : 'center'}
          accessibilityLabel={accessibilityLabel ?? label ?? rest.placeholder}
          accessibilityHint={error ? `Error: ${error}` : hint}
          accessibilityState={{ disabled: !editable }}
          onFocus={alEnfocar}
          onBlur={alDesenfocar}
          returnKeyType={encadenar ? 'next' : returnKeyType}
          submitBehavior={encadenar ? 'submit' : submitBehavior}
          onSubmitEditing={encadenar ? alSiguiente : onSubmitEditing}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            hitSlop={6}
            onPress={() => setHidden((prev) => !prev)}
            style={styles.toggle}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {nota || mostrarContador ? (
        <View style={styles.pie}>
          {nota ? (
            <Text style={[styles.nota, error ? styles.error : null]} accessibilityLiveRegion={error ? 'polite' : 'none'}>
              {nota}
            </Text>
          ) : (
            <View style={styles.flex} />
          )}
          {mostrarContador ? (
            <Text style={[styles.contador, longitud >= maxLength ? styles.contadorLleno : null]}>
              {longitud}/{maxLength}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      gap: Spacing.xs + 2,
    },
    label: {
      fontSize: FontSize.sm,
      lineHeight: LineHeight.sm,
      fontWeight: '700',
      color: Colors.text,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderWidth: 1.5,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      backgroundColor: Colors.surface,
      paddingHorizontal: Spacing.md,
      minHeight: 52,
    },
    inputWrapperMultiline: {
      alignItems: 'flex-start',
      paddingVertical: Spacing.xs,
    },
    inputWrapperFocused: {
      borderColor: Colors.primary,
      backgroundColor: Colors.surfaceRaised,
    },
    inputWrapperDisabled: {
      backgroundColor: Colors.surfaceMuted,
    },
    inputWrapperError: {
      borderColor: Colors.danger,
    },
    input: {
      flex: 1,
      minHeight: 50,
      paddingVertical: Spacing.sm,
      fontSize: FontSize.md,
      color: Colors.text,
      // Web: el anillo de foco lo pinta el contenedor (sin el contorno negro del navegador).
      outlineWidth: 0,
    },
    inputMultiline: {
      minHeight: ALTURA_MIN_MULTILINEA,
      maxHeight: ALTURA_MAX_MULTILINEA,
      lineHeight: LineHeight.md,
      paddingTop: Spacing.sm,
    },
    inputDisabled: {
      color: Colors.textMuted,
    },
    iconMultiline: {
      marginTop: Spacing.md,
    },
    toggle: {
      minWidth: Layout.minTouchTarget,
      minHeight: Layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: -Spacing.sm,
    },
    pie: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    flex: {
      flex: 1,
    },
    nota: {
      flex: 1,
      fontSize: FontSize.xs,
      lineHeight: LineHeight.xs,
      color: Colors.textMuted,
    },
    error: {
      color: Colors.danger,
      fontWeight: '600',
    },
    contador: {
      fontSize: FontSize.xs,
      lineHeight: LineHeight.xs,
      color: Colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    contadorLleno: {
      color: Colors.warning,
      fontWeight: '700',
    },
  });
