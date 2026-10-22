import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { FontSize, LineHeight, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { formatCurrencyMXN, parseCurrencyInput } from '@/utils/formatters';

export interface MoneyFieldProps {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  error?: string;
  helper?: string;
  placeholder?: string;
}

/**
 * Captura de un monto en pesos: teclado numérico, símbolo visible y el
 * formato MXN como apoyo debajo. Lo que sale por `onChange` (y por tanto
 * lo que viaja a `monto_solicitado`) es SIEMPRE un número limpio, nunca
 * "$1,500.00" (sección 10 del encargo).
 *
 * No calcula intereses ni pagos: el backend no define esas reglas, así que
 * la app tampoco las inventa.
 */
export function MoneyField({ label, value, onChange, error, helper, placeholder = '0.00' }: MoneyFieldProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const [enfocado, setEnfocado] = useState(false);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, enfocado && styles.inputWrapperFocused, error ? styles.inputWrapperError : null]}>
        <Text style={styles.currency}>$</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.primary}
          cursorColor={Colors.primary}
          accessibilityLabel={`${label}, en pesos`}
          accessibilityHint={error ? `Error: ${error}` : undefined}
          value={value === undefined ? '' : String(value)}
          onChangeText={(text) => onChange(parseCurrencyInput(text))}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
        />
        <Text style={styles.suffix}>MXN</Text>
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : (
        <Text style={styles.helper}>{value !== undefined ? formatCurrencyMXN(value) : (helper ?? '')}</Text>
      )}
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: { gap: Spacing.xs + 2 },
    label: { fontSize: FontSize.sm, lineHeight: LineHeight.sm, fontWeight: '700', color: Colors.text },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderWidth: 1.5,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      backgroundColor: Colors.surface,
      paddingHorizontal: Spacing.md,
      // Sin alto fijo: con letra grande de accesibilidad el campo crece, no corta.
      minHeight: 52,
    },
    inputWrapperFocused: { borderColor: Colors.primary },
    inputWrapperError: { borderColor: Colors.danger },
    currency: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primaryDark },
    input: { flex: 1, minHeight: 50, paddingVertical: Spacing.sm, fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, outlineWidth: 0 },
    suffix: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
    error: { fontSize: FontSize.xs, lineHeight: LineHeight.xs, color: Colors.danger, fontWeight: '600' },
    helper: { fontSize: FontSize.xs, lineHeight: LineHeight.xs, color: Colors.textMuted },
  });
