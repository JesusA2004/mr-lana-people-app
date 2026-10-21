import { StyleSheet, Text, View } from 'react-native';

import { porcentajeSeguro } from './tonos';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { PressableScale } from '@/components/PressableScale';
import { FontSize, Radius, Shadow, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';

export interface TarjetaProgresoProps {
  /** Sobretítulo pequeño («MI EXPEDIENTE»). */
  sobretitulo: string;
  /** Frase principal («Te faltan 3 documentos»). */
  titulo: string;
  /** null = sin barra ni porcentaje (no hay nada que medir). */
  porcentaje: number | null;
  /** Línea de apoyo bajo la barra. */
  detalle?: React.ReactNode;
  completo?: boolean;
  onPress?: () => void;
}

/** Tarjeta «hero» de avance: sobretítulo, frase, porcentaje grande y barra animada. */
export function TarjetaProgreso({ sobretitulo, titulo, porcentaje, detalle, completo = false, onPress }: TarjetaProgresoProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const pct = porcentaje === null ? null : porcentajeSeguro(porcentaje);

  const cuerpo = (
    <>
      <View style={styles.fila}>
        <View style={styles.textos}>
          <Text style={styles.sobretitulo}>{sobretitulo}</Text>
          <Text style={styles.titulo}>{titulo}</Text>
        </View>
        {pct !== null ? (
          <Text style={[styles.porcentaje, completo && { color: Colors.success }]} accessibilityLabel={`${pct} por ciento`}>
            {pct}%
          </Text>
        ) : null}
      </View>
      {pct !== null ? <AnimatedProgressBar percent={pct} height={10} color={completo ? Colors.success : undefined} /> : null}
      {detalle ? <View>{typeof detalle === 'string' ? <Text style={styles.detalle}>{detalle}</Text> : detalle}</View> : null}
    </>
  );

  if (!onPress) return <View style={styles.tarjeta}>{cuerpo}</View>;
  return (
    <PressableScale onPress={onPress} style={styles.tarjeta} accessibilityLabel={`${sobretitulo}. ${titulo}${pct !== null ? `. ${pct} por ciento` : ''}`}>
      {cuerpo}
    </PressableScale>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    tarjeta: {
      backgroundColor: Colors.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.xl,
      gap: Spacing.md,
      ...Shadow.md,
    },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    textos: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    sobretitulo: {
      fontSize: FontSize.xs,
      fontWeight: '800',
      color: Colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    titulo: {
      fontSize: FontSize.lg,
      fontWeight: '800',
      color: Colors.text,
    },
    porcentaje: {
      fontSize: FontSize.xxxl,
      fontWeight: '800',
      color: Colors.primaryDark,
    },
    detalle: {
      fontSize: FontSize.sm,
      color: Colors.textMuted,
    },
  });
