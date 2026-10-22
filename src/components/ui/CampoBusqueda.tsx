import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { haptics } from '@/utils/haptics';

export interface CampoBusquedaProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (texto: string) => void;
  /** Contenedor (márgenes de la pantalla). El anillo de foco siempre gana. */
  style?: StyleProp<ViewStyle>;
  /** Oculta el botón de limpiar (por defecto aparece cuando hay texto). */
  sinLimpiar?: boolean;
}

/**
 * Buscador estándar de listas: lupa, texto, botón «Limpiar» de 44 dp y
 * anillo de foco. Tecla «Buscar» cierra el teclado (la lista ya filtra al
 * escribir: sin mínimo de letras). Combínalo con una lista que tenga
 * `keyboardShouldPersistTaps="handled"` y `keyboardDismissMode="on-drag"`.
 */
export const CampoBusqueda = forwardRef<TextInput, CampoBusquedaProps>(function CampoBusqueda(
  { value, onChangeText, style, sinLimpiar = false, placeholder = 'Buscar', accessibilityLabel, onFocus, onBlur, ...rest },
  ref,
) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const inputRef = useRef<TextInput>(null);
  const [enfocado, setEnfocado] = useState(false);
  useImperativeHandle(ref, () => inputRef.current as TextInput, []);

  return (
    <View style={[styles.contenedor, style, enfocado && styles.enfocado]}>
      <Ionicons name="search-outline" size={18} color={enfocado ? Colors.primaryDark : Colors.textMuted} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        selectionColor={Colors.primary}
        cursorColor={Colors.primary}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        accessibilityRole="search"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        style={styles.input}
        onFocus={(event) => {
          setEnfocado(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setEnfocado(false);
          onBlur?.(event);
        }}
        {...rest}
      />
      {!sinLimpiar && value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
          hitSlop={4}
          onPress={() => {
            haptics.selection();
            onChangeText('');
            inputRef.current?.focus();
          }}
          style={({ pressed }) => [styles.limpiar, pressed && styles.limpiarPresionado]}>
          <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
});

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    contenedor: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingLeft: Spacing.md,
      paddingRight: Spacing.xs,
      minHeight: Layout.minTouchTarget + 4,
      borderRadius: Radius.full,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    enfocado: {
      borderColor: Colors.primary,
      borderWidth: 1.5,
    },
    input: {
      flex: 1,
      minHeight: Layout.minTouchTarget,
      paddingVertical: Spacing.sm,
      fontSize: FontSize.md,
      color: Colors.text,
      // Web: el anillo de foco lo pinta el contenedor.
      outlineWidth: 0,
    },
    limpiar: {
      width: Layout.minTouchTarget,
      height: Layout.minTouchTarget,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    limpiarPresionado: {
      opacity: 0.6,
    },
  });
