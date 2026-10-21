import { StyleSheet, Text, View } from 'react-native';

import { IconoTono, type NombreIcono } from './IconoTono';
import { textoBadge, type Tono } from './tonos';

import { PressableScale } from '@/components/PressableScale';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';

export interface AccesoRapidoProps {
  icono: NombreIcono;
  etiqueta: string;
  onPress: () => void;
  tono?: Tono;
  badge?: number;
}

/** Atajo de la rejilla de inicio: ícono + etiqueta en 2 líneas, área táctil ≥ 88 dp. */
export function AccesoRapido({ icono, etiqueta, onPress, tono = 'primario', badge }: AccesoRapidoProps) {
  const styles = useEstilos(crearEstilos);
  const badgeTexto = textoBadge(badge);
  return (
    <PressableScale accessibilityLabel={badgeTexto ? `${etiqueta}, ${badgeTexto} pendientes` : etiqueta} onPress={onPress} style={styles.celda}>
      <View>
        <IconoTono icono={icono} tono={tono} tamano={44} />
        {badgeTexto ? (
          <View style={styles.badge}>
            <Text style={styles.badgeTexto}>{badgeTexto}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.etiqueta} numberOfLines={2}>
        {etiqueta}
      </Text>
    </PressableScale>
  );
}

/** Rejilla de 3 columnas para `AccesoRapido` (se ajusta sola en 320 dp). */
export function RejillaAccesos({ children }: { children: React.ReactNode }) {
  const styles = useEstilos(crearEstilos);
  return <View style={styles.rejilla}>{children}</View>;
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    rejilla: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    celda: {
      flexBasis: '31%',
      flexGrow: 1,
      maxWidth: '33%',
      minHeight: 96,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xs,
      backgroundColor: Colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    etiqueta: {
      fontSize: FontSize.xs + 1,
      fontWeight: '700',
      color: Colors.text,
      textAlign: 'center',
    },
    badge: {
      position: 'absolute',
      top: -6,
      right: -10,
      minWidth: 20,
      height: 20,
      borderRadius: Radius.full,
      paddingHorizontal: 5,
      backgroundColor: Colors.danger,
      borderWidth: 2,
      borderColor: Colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeTexto: {
      fontSize: 10,
      fontWeight: '800',
      color: Colors.white,
    },
  });
