import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/PressableScale';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { FontSize, Layout, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';

export interface EncabezadoSaludoProps {
  saludo: string;
  nombre: string;
  /** «Puesto · Empresa». */
  detalle?: string | null;
  foto?: { fotoUrlApi?: string | null; fotoUrl?: string | null };
  nombreCompleto?: string;
  onPressAvatar?: () => void;
  /** Acciones a la derecha (campana). */
  derecha?: React.ReactNode;
}

/** Encabezado de Inicio: avatar + «Buenas tardes» + nombre grande + puesto, con safe area superior. */
export function EncabezadoSaludo({ saludo, nombre, detalle, foto, nombreCompleto, onPressAvatar, derecha }: EncabezadoSaludoProps) {
  const styles = useEstilos(crearEstilos);
  const insets = useSafeAreaInsets();

  const identidad = (
    <>
      <ProfileAvatar name={nombreCompleto ?? nombre} fotoUrlApi={foto?.fotoUrlApi} fotoUrl={foto?.fotoUrl} size={52} />
      <View style={styles.textos}>
        <Text style={styles.saludo}>{saludo}</Text>
        <Text style={styles.nombre} numberOfLines={1} accessibilityRole="header">
          {nombre}
        </Text>
        {detalle ? (
          <Text style={styles.detalle} numberOfLines={1}>
            {detalle}
          </Text>
        ) : null}
      </View>
    </>
  );

  return (
    <View style={[styles.contenedor, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.interior}>
        {onPressAvatar ? (
          <PressableScale accessibilityLabel="Ir a mi perfil" onPress={onPressAvatar} haptic={false} style={styles.identidad}>
            {identidad}
          </PressableScale>
        ) : (
          <View style={styles.identidad}>{identidad}</View>
        )}
        {derecha}
      </View>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    contenedor: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.lg,
      backgroundColor: Colors.background,
    },
    interior: {
      width: '100%',
      maxWidth: Layout.maxContentWidth,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    identidad: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      flexShrink: 1,
    },
    textos: {
      flexShrink: 1,
      gap: 1,
    },
    saludo: {
      fontSize: FontSize.sm,
      fontWeight: '600',
      color: Colors.textMuted,
    },
    nombre: {
      fontSize: FontSize.xxl,
      fontWeight: '800',
      color: Colors.text,
    },
    detalle: {
      fontSize: FontSize.xs,
      fontWeight: '600',
      color: Colors.textMuted,
    },
  });
