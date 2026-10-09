import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { PressableScale } from '../PressableScale';

import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';

export interface TimeFieldProps {
  label: string;
  /** Hora `HH:MM` (24 h), tal cual la valida el backend (`date_format:H:i`). */
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
  placeholder?: string;
}

function aFecha(valor?: string): Date {
  const fecha = new Date();
  const partes = valor?.match(/^(\d{2}):(\d{2})$/);
  fecha.setHours(partes ? Number(partes[1]) : 9, partes ? Number(partes[2]) : 0, 0, 0);
  return fecha;
}

function aHora(fecha: Date): string {
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

/** Selector de hora nativo (mismo patrón que `DateField`). */
export function TimeField({ label, value, onChange, error, helper, placeholder = 'Selecciona una hora' }: TimeFieldProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <PressableScale
        haptic={false}
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={[styles.input, error && styles.inputError] as object}>
        <Ionicons name="time-outline" size={18} color={Colors.textMuted} />
        <Text style={[styles.value, !value && styles.placeholder]}>{value ? `${value} h` : placeholder}</Text>
      </PressableScale>
      {error ? <Text style={styles.error}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}

      {open ? (
        <DateTimePicker
          value={aFecha(value)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selected) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (event.type === 'set' && selected) onChange(aHora(selected));
          }}
        />
      ) : null}
      {open && Platform.OS === 'ios' ? <Button title="Listo" variant="ghost" onPress={() => setOpen(false)} /> : null}
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
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
