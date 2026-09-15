import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { PressableScale } from '../PressableScale';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { formatDateLong, toApiDateString } from '@/utils/dates';

export interface DateFieldProps {
  label: string;
  value?: Date;
  onChange: (date: Date) => void;
  error?: string;
  helper?: string;
  placeholder?: string;
}

/**
 * Selector de fecha nativo, idéntico en Android e iOS. En iOS el picker se
 * queda abierto (inline) hasta que el usuario toca "Listo"; en Android el
 * diálogo del sistema se cierra solo. Ningún camino usa API exclusiva de
 * una plataforma (sección 53).
 */
export function DateField({ label, value, onChange, error, helper, placeholder = 'Selecciona una fecha' }: DateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <PressableScale
        haptic={false}
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={[styles.input, error && styles.inputError] as object}>
        <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
        <Text style={[styles.value, !value && styles.placeholder]}>{value ? formatDateLong(toApiDateString(value)) : placeholder}</Text>
      </PressableScale>
      {error ? <Text style={styles.error}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}

      {open ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selected) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (event.type === 'set' && selected) onChange(selected);
          }}
        />
      ) : null}
      {open && Platform.OS === 'ios' ? <Button title="Listo" variant="ghost" onPress={() => setOpen(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  input: {
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
  inputError: { borderColor: Colors.danger },
  value: { fontSize: FontSize.md, color: Colors.text, flex: 1 },
  placeholder: { color: Colors.textMuted },
  error: { fontSize: FontSize.xs, color: Colors.danger, fontWeight: '600' },
  helper: { fontSize: FontSize.xs, color: Colors.textMuted },
});
