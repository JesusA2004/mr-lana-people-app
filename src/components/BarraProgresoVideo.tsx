import { useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';
import { formatoTiempo, posicionDesdeBarra } from '@/utils/induccion';

export interface BarraProgresoVideoProps {
  /** Segundos totales del video (0 mientras carga). */
  duracion: number;
  /** Posición actual en segundos. */
  actual: number;
  /** Lo máximo ya visto: la barra NO deja ir más allá. */
  maximoVisto: number;
  /** Se pidió ir a esta posición (ya limitada a lo visto). */
  onBuscar: (segundos: number) => void;
}

/**
 * Barra de progreso propia del video de la inducción: muestra lo VISTO
 * (tramo claro) contra el total y la posición actual. Tocar o arrastrar solo
 * mueve dentro de lo ya visto (`posicionDesdeBarra`): no hay forma de
 * adelantar desde aquí.
 */
export function BarraProgresoVideo({ duracion, actual, maximoVisto, onBuscar }: BarraProgresoVideoProps) {
  const styles = useEstilos(crearEstilos);
  const [ancho, setAncho] = useState(0);
  const total = duracion > 0 ? duracion : 0;
  const pct = (valor: number) => (total > 0 ? `${Math.min(100, Math.max(0, (valor / total) * 100))}%` : '0%');

  const buscar = (event: GestureResponderEvent) => {
    if (ancho <= 0 || total <= 0) return;
    onBuscar(posicionDesdeBarra(event.nativeEvent.locationX / ancho, total, maximoVisto));
  };

  return (
    <View style={styles.contenedor}>
      <View
        testID="barra-progreso-video"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Avance del video"
        accessibilityValue={{ min: 0, max: Math.round(total), now: Math.round(actual), text: `${formatoTiempo(actual)} de ${formatoTiempo(total)}` }}
        style={styles.zonaToque}
        onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={buscar}
        onResponderMove={buscar}
        onResponderRelease={buscar}>
        <View style={styles.pista}>
          <View style={[styles.visto, { width: pct(maximoVisto) as `${number}%` }]} />
          <View style={[styles.actual, { width: pct(actual) as `${number}%` }]} />
        </View>
        <View style={[styles.perilla, { left: pct(actual) as `${number}%` }]} />
      </View>
      <View style={styles.tiempos}>
        <Text style={styles.tiempo}>{formatoTiempo(actual)}</Text>
        <Text style={styles.tiempo}>{formatoTiempo(total)}</Text>
      </View>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    contenedor: { gap: Spacing.xs },
    zonaToque: { height: 32, justifyContent: 'center' },
    pista: { height: 6, borderRadius: Radius.full, backgroundColor: Colors.border, overflow: 'hidden' },
    visto: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Colors.primarySoft },
    actual: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Colors.primary },
    perilla: {
      position: 'absolute',
      width: 18,
      height: 18,
      marginLeft: -9,
      borderRadius: Radius.full,
      backgroundColor: Colors.primary,
      borderWidth: 2,
      borderColor: Colors.white,
    },
    tiempos: { flexDirection: 'row', justifyContent: 'space-between' },
    tiempo: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  });
