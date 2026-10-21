import { StyleSheet, Text, View } from 'react-native';

import { IconoTono, type NombreIcono } from './IconoTono';
import type { Tono } from './tonos';

import { PressableScale } from '@/components/PressableScale';
import { FontSize, Radius, Shadow, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';

export interface TarjetaResumenProps {
  icono: NombreIcono;
  /** Cifra grande («12», «—»). */
  valor: number | string;
  etiqueta: string;
  /** Línea de apoyo («2 en solicitud»). */
  nota?: string;
  tono?: Tono;
  /** Fondo de marca suave: la cifra más importante de la pantalla. */
  destacada?: boolean;
  onPress?: () => void;
}

/**
 * Indicador compacto (stat tile): ícono, cifra, etiqueta y nota. Para filas
 * de 2 indicadores (`<View style={{ flexDirection: 'row', gap }}>` con
 * `flex: 1` en cada una). Tocable → lleva al detalle.
 */
export function TarjetaResumen({ icono, valor, etiqueta, nota, tono = 'primario', destacada = false, onPress }: TarjetaResumenProps) {
  const styles = useEstilos(crearEstilos);
  const cuerpo = (
    <>
      <IconoTono icono={icono} tono={tono} tamano={36} solido={destacada} />
      <Text style={[styles.valor, destacada && styles.valorDestacado]} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      <Text style={styles.etiqueta} numberOfLines={2}>
        {etiqueta}
      </Text>
      {nota ? (
        <Text style={styles.nota} numberOfLines={2}>
          {nota}
        </Text>
      ) : null}
    </>
  );

  const estilo = [styles.tarjeta, destacada && styles.destacada];
  if (!onPress) return <View style={estilo}>{cuerpo}</View>;
  return (
    <PressableScale onPress={onPress} accessibilityLabel={[etiqueta, String(valor), nota].filter(Boolean).join(': ')} style={estilo}>
      {cuerpo}
    </PressableScale>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    tarjeta: {
      flex: 1,
      minHeight: 128,
      backgroundColor: Colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.lg,
      gap: 2,
      ...Shadow.sm,
    },
    destacada: {
      backgroundColor: Colors.primarySoft,
      borderColor: Colors.primarySoft,
    },
    valor: {
      fontSize: FontSize.xxl + 4,
      fontWeight: '800',
      color: Colors.text,
      marginTop: Spacing.sm,
    },
    valorDestacado: {
      color: Colors.primaryDark,
    },
    etiqueta: {
      fontSize: FontSize.sm,
      fontWeight: '700',
      color: Colors.text,
    },
    nota: {
      fontSize: FontSize.xs,
      color: Colors.textMuted,
    },
  });
