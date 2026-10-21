import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { coloresTono } from '@/components/ui';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { FlujoAprobacion } from '@/types/aprobaciones';
import { flujoVisual } from '@/utils/flujoAprobacion';

export interface FlujoAprobacionTimelineProps {
  flujo: FlujoAprobacion;
  testID?: string;
}

/**
 * Línea de tiempo del motor de aprobaciones, EXACTAMENTE con los pasos que
 * manda el backend (`flujo[]`):
 *
 *   ✓ Solicitud creada — Ana López — 20/10/2026 14:30
 *   ○ Gerente de sucursal — Alberto Carlos Bueno — Pendiente
 *   ○ Gerente regional — Esperando paso anterior
 *   ○ Recursos Humanos — Esperando paso anterior
 *
 * Estado = ícono + texto (nunca solo color). El paso que le toca a la cuenta
 * actual se resalta con «Te toca a ti».
 */
export function FlujoAprobacionTimeline({ flujo, testID }: FlujoAprobacionTimelineProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const pasos = flujoVisual(flujo);

  return (
    <View testID={testID} accessibilityRole="list" accessibilityLabel="Pasos de aprobación">
      {pasos.map((paso, index) => {
        const c = coloresTono(Colors, paso.tono);
        const ultimo = index === pasos.length - 1;
        const relleno = paso.simbolo === '✓' || paso.simbolo === '✕';
        return (
          <View
            key={paso.key}
            style={styles.fila}
            accessible
            accessibilityLabel={[`${paso.simbolo} ${paso.titulo}`, paso.detalle, paso.nota].filter(Boolean).join('. ')}>
            <View style={styles.columnaIcono}>
              <View
                style={[
                  styles.punto,
                  relleno ? { backgroundColor: c.texto } : { backgroundColor: c.fondo, borderColor: c.texto, borderWidth: 1.5 },
                  paso.esMiTurno && styles.puntoTurno,
                ]}>
                <Ionicons name={paso.icono} size={relleno ? 14 : 12} color={relleno ? Colors.white : c.texto} />
              </View>
              {!ultimo ? <View style={[styles.conector, paso.completado && { backgroundColor: Colors.success }]} /> : null}
            </View>
            <View style={[styles.textos, paso.esMiTurno && { backgroundColor: c.fondo }]}>
              <Text style={[styles.titulo, paso.simbolo === '○' && !paso.esMiTurno && styles.tituloEnEspera]}>{paso.titulo}</Text>
              {paso.detalle ? <Text style={[styles.detalle, { color: paso.tono === 'neutral' ? Colors.textMuted : c.texto }]}>{paso.detalle}</Text> : null}
              {paso.nota ? <Text style={styles.nota}>{paso.nota}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    fila: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    columnaIcono: {
      alignItems: 'center',
      width: 28,
    },
    punto: {
      width: 26,
      height: 26,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    puntoTurno: {
      transform: [{ scale: 1.1 }],
    },
    conector: {
      width: 2,
      flex: 1,
      minHeight: 18,
      backgroundColor: Colors.border,
      marginVertical: 2,
    },
    textos: {
      flex: 1,
      minWidth: 0,
      paddingBottom: Spacing.lg,
      paddingHorizontal: Spacing.xs,
      borderRadius: Radius.sm,
      gap: 2,
    },
    titulo: {
      fontSize: FontSize.sm,
      fontWeight: '800',
      color: Colors.text,
      marginTop: 3,
    },
    tituloEnEspera: {
      fontWeight: '700',
      color: Colors.textMuted,
    },
    detalle: {
      fontSize: FontSize.sm,
      fontWeight: '600',
    },
    nota: {
      fontSize: FontSize.xs,
      color: Colors.textMuted,
      lineHeight: 17,
    },
  });
