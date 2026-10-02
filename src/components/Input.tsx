import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';

export interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  secureToggle?: boolean;
}

/** Campo de formulario reutilizable (label + input + error), usado con React Hook Form. */
export const Input = forwardRef<TextInput, InputProps>(function Input({ label, error, secureToggle = false, secureTextEntry, style, ...rest }, ref) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            hitSlop={10}
            onPress={() => setHidden((prev) => !prev)}
            style={styles.toggle}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      gap: Spacing.xs,
    },
    label: {
      fontSize: FontSize.sm,
      fontWeight: '700',
      color: Colors.text,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      backgroundColor: Colors.surface,
      paddingHorizontal: Spacing.md,
    },
    inputWrapperError: {
      borderColor: Colors.danger,
    },
    input: {
      flex: 1,
      minHeight: 52,
      fontSize: FontSize.md,
      color: Colors.text,
    },
    toggle: {
      padding: Spacing.xs,
    },
    error: {
      fontSize: FontSize.xs,
      color: Colors.danger,
      fontWeight: '600',
    },
  });
