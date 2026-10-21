import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';
import { haptics } from '@/utils/haptics';

export interface OpcionSegmento<T extends string> {
  valor: T;
  etiqueta: string;
}

export interface ControlSegmentadoProps<T extends string> {
  opciones: OpcionSegmento<T>[];
  valor: T;
  onChange: (valor: T) => void;
  accessibilityLabel?: string;
}

/**
 * Control segmentado (2–4 opciones excluyentes: «Todas | No leídas»,
 * «Pendientes | Resueltas»). 44 dp de alto, háptico de selección, estado
 * `selected` para lectores de pantalla.
 */
export function ControlSegmentado<T extends string>({ opciones, valor, onChange, accessibilityLabel }: ControlSegmentadoProps<T>) {
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.contenedor} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {opciones.map((opcion) => {
        const activo = opcion.valor === valor;
        return (
          <Pressable
            key={opcion.valor}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            onPress={() => {
              if (activo) return;
              haptics.selection();
              onChange(opcion.valor);
            }}
            style={[styles.segmento, activo && styles.segmentoActivo]}>
            <Text style={[styles.texto, activo && styles.textoActivo]} numberOfLines={1}>
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    contenedor: {
      flexDirection: 'row',
      backgroundColor: Colors.surfaceMuted,
      borderRadius: Radius.full,
      padding: 4,
      gap: 4,
    },
    segmento: {
      flex: 1,
      minHeight: Layout.minTouchTarget - 4,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
    },
    segmentoActivo: {
      backgroundColor: Colors.surface,
      shadowColor: Colors.text,
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    texto: {
      fontSize: FontSize.sm,
      fontWeight: '700',
      color: Colors.textMuted,
    },
    textoActivo: {
      color: Colors.primaryDark,
      fontWeight: '800',
    },
  });
