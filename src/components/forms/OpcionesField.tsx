import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '../PressableScale';

import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { SolicitudCampoOpcion } from '@/types/request';

export interface OpcionesFieldProps {
  label: string;
  value?: string;
  opciones: SolicitudCampoOpcion[];
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
}

/**
 * Opción única dibujada como casillas visibles (no un desplegable): el
 * permiso oficial tiene pocas opciones y el colaborador debe verlas todas,
 * igual que las casillas del formato impreso.
 */
export function OpcionesField({ label, value, opciones, onChange, error, helper }: OpcionesFieldProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.lista} accessibilityLabel={label}>
        {opciones.map((opcion) => {
          const activa = opcion.value === value;
          return (
            <PressableScale
              key={opcion.value}
              haptic={false}
              accessibilityRole="button"
              accessibilityLabel={activa ? `${opcion.label}, seleccionado` : opcion.label}
              onPress={() => onChange(opcion.value)}
              style={[styles.opcion, activa && styles.opcionActiva, error && !value && styles.opcionError] as object}>
              <Ionicons name={activa ? 'checkbox' : 'square-outline'} size={20} color={activa ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.opcionTexto, activa && styles.opcionTextoActivo]}>{opcion.label}</Text>
            </PressableScale>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: { gap: Spacing.xs },
    label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
    lista: { gap: Spacing.sm },
    opcion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      minHeight: 48,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
    },
    opcionActiva: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
    opcionError: { borderColor: Colors.danger },
    opcionTexto: { flex: 1, fontSize: FontSize.md, color: Colors.text },
    opcionTextoActivo: { fontWeight: '700', color: Colors.primaryDark },
    error: { fontSize: FontSize.xs, color: Colors.danger, fontWeight: '600' },
    helper: { fontSize: FontSize.xs, color: Colors.textMuted },
  });
