import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize } from '@/constants/colors';

export interface SecurityWatermarkProps {
  /** Texto corto a repetir, ej. "Jesús A. · EMP-1234". Debe identificar a quien está viendo la pantalla, no datos de terceros. */
  label: string;
}

const ROWS = 6;
const COLS = 3;

/**
 * Marca de agua diagonal, discreta, repetida — para pantallas MUY sensibles
 * (información personal identificable). Reduce el valor de una foto tomada
 * con OTRO dispositivo a la pantalla (lo único que ningún software puede
 * evitar): la marca queda en la foto y delata quién la tomó.
 *
 * Úsala solo donde de verdad haga falta (documentos/datos sensibles) —
 * NUNCA en toda la app, satura la lectura. `pointerEvents="none"` para no
 * interceptar toques de la pantalla que cubre.
 */
export function SecurityWatermark({ label }: SecurityWatermarkProps) {
  return (
    <View style={styles.container} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: ROWS }).map((_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: COLS }).map((_, col) => (
            <Text key={col} style={styles.label} numberOfLines={1}>
              {label}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    justifyContent: 'space-evenly',
    transform: [{ rotate: '-28deg' }, { scale: 1.4 }],
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.watermark,
  },
});
