import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontSize, Layout, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';

export interface SeccionTituloProps {
  titulo: string;
  /** Texto de apoyo debajo del título. */
  descripcion?: string;
  /** Acción secundaria a la derecha («Ver todas»). Área táctil ≥ 44 dp. */
  accion?: { etiqueta: string; onPress: () => void };
}

/** Encabezado de sección (`accessibilityRole="header"`) con acción opcional. */
export function SeccionTitulo({ titulo, descripcion, accion }: SeccionTituloProps) {
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.fila}>
      <View style={styles.textos}>
        <Text style={styles.titulo} accessibilityRole="header">
          {titulo}
        </Text>
        {descripcion ? <Text style={styles.descripcion}>{descripcion}</Text> : null}
      </View>
      {accion ? (
        <Pressable accessibilityRole="button" accessibilityLabel={accion.etiqueta} onPress={accion.onPress} hitSlop={8} style={styles.accion}>
          <Text style={styles.accionTexto}>{accion.etiqueta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: -Spacing.xs,
    },
    textos: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    titulo: {
      fontSize: FontSize.lg,
      fontWeight: '800',
      color: Colors.text,
    },
    descripcion: {
      fontSize: FontSize.sm,
      color: Colors.textMuted,
    },
    accion: {
      minHeight: Layout.minTouchTarget,
      justifyContent: 'center',
      paddingHorizontal: Spacing.xs,
    },
    accionTexto: {
      fontSize: FontSize.sm,
      fontWeight: '800',
      color: Colors.primaryDark,
    },
  });
