import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { PressableScale } from '../PressableScale';

import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { horaParaApi } from '@/utils/agenda';

export interface HoraFieldProps {
  label: string;
  value?: Date;
  onChange: (hora: Date) => void;
  error?: string;
}

/** Selector de hora nativo: mismo comportamiento que `DateField` en Android e iOS. */
export function HoraField({ label, value, onChange, error }: HoraFieldProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <PressableScale haptic={false} accessibilityLabel={label} onPress={() => setOpen(true)} style={[styles.input, error && styles.inputError] as object}>
        <Ionicons name="time-outline" size={18} color={Colors.textMuted} />
        <Text style={[styles.value, !value && styles.placeholder]}>{value ? horaParaApi(value) : 'Selecciona la hora'}</Text>
      </PressableScale>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {open ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
  });
