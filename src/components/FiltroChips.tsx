import { ScrollView, StyleSheet, Text } from 'react-native';

import { PressableScale } from './PressableScale';

import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';

export interface OpcionFiltro<T extends string> {
  label: string;
  value: T;
}

interface FiltroChipsProps<T extends string> {
  opciones: OpcionFiltro<T>[];
  valor: T;
  onChange: (valor: T) => void;
  accessibilityLabel?: string;
}

/**
 * Fila de filtros tipo «chip» (estado, tipo, familia…). Un FlatList/
 * ScrollView horizontal crece por defecto (`flexGrow: 1`) y estiraba los
 * chips hasta volverlos óvalos enormes; aquí la fila mide lo que su
 * contenido (`flexGrow: 0`) y cada chip tiene alto fijo y táctil (44 pt).
 * Activo = menta con borde petróleo (paleta pastel), nunca un bloque sólido.
 */
export function FiltroChips<T extends string>({ opciones, valor, onChange, accessibilityLabel }: FiltroChipsProps<T>) {
  const styles = useEstilos(crearEstilos);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.fila}
      contentContainerStyle={styles.contenido}
      accessibilityLabel={accessibilityLabel}>
      {opciones.map((opcion) => {
        const activo = opcion.value === valor;
        return (
          <PressableScale
            key={opcion.value}
            haptic={false}
            accessibilityRole="button"
            accessibilityLabel={activo ? `${opcion.label}, seleccionado` : opcion.label}
            onPress={() => onChange(opcion.value)}
            style={[styles.chip, activo && styles.chipActivo] as object}>
            <Text style={[styles.texto, activo && styles.textoActivo]} numberOfLines={1}>
              {opcion.label}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    fila: {
      flexGrow: 0,
      flexShrink: 0,
    },
    contenido: {
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    chip: {
      height: 36,
      minWidth: Layout.minTouchTarget,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    chipActivo: {
      backgroundColor: Colors.primarySoft,
      borderColor: Colors.primary,
    },
    texto: {
      fontSize: FontSize.sm,
      fontWeight: '600',
      color: Colors.textMuted,
    },
    textoActivo: {
      color: Colors.primaryDark,
      fontWeight: '700',
    },
  });
