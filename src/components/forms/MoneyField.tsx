import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
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
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        <Text style={styles.currency}>$</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value === undefined ? '' : String(value)}
          onChangeText={(text) => onChange(parseCurrencyInput(text))}
        />
        <Text style={styles.suffix}>MXN</Text>
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <Text style={styles.helper}>{value !== undefined ? formatCurrencyMXN(value) : (helper ?? '')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  inputWrapperError: { borderColor: Colors.danger },
  currency: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primaryDark },
  input: { flex: 1, fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  suffix: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
  error: { fontSize: FontSize.xs, color: Colors.danger, fontWeight: '600' },
  helper: { fontSize: FontSize.xs, color: Colors.textMuted },
});
