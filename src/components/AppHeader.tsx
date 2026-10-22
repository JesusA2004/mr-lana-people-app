import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontSize, LineHeight, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { volverAtras } from '@/utils/navegacion';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  /**
   * Por defecto «Atrás» usa `volverAtras`: si la pantalla quedó sola en la
   * pila (se abrió desde un push o un enlace), vuelve al inicio de la
   * experiencia activa en vez de quedarse sin salida.
   */
  onBackPress?: () => void;
  right?: React.ReactNode;
  /**
   * Líneas máximas del título antes de truncar con "…". La mayoría de las
   * pantallas tienen títulos cortos fijos y usan el default (1). Pantallas
   * con título dinámico y potencialmente largo (ej. el nombre real de un
   * documento, "Constancia de situación fiscal (RFC)") deben pasar `0` para
   * que NUNCA se corte — envuelve las líneas que haga falta.
   */
  titleNumberOfLines?: number;
}

/**
 * Encabezado propio de marca (reemplaza el header nativo, headerShown está
 * en `false` en todos los Stack de la app) para mantener un look consistente.
 */
export function AppHeader({ title, subtitle, showBack = false, onBackPress, right, titleNumberOfLines = 1 }: AppHeaderProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const alRegresar = onBackPress ?? (() => volverAtras(router));

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Regresar"
              hitSlop={4}
              onPress={alRegresar}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </Pressable>
          ) : null}
          <View style={styles.titleColumn}>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={titleNumberOfLines === 0 ? undefined : titleNumberOfLines}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      backgroundColor: Colors.background,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flex: 1,
      minWidth: 0,
    },
    titleColumn: {
      flex: 1,
      minWidth: 0,
    },
    // 40 dp visibles + hitSlop = área táctil ≥ 44 dp.
    backButton: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backButtonPressed: {
      backgroundColor: Colors.surfaceMuted,
      transform: [{ scale: 0.96 }],
    },
    title: {
      fontSize: FontSize.xl,
      lineHeight: LineHeight.xl,
      fontWeight: '800',
      color: Colors.text,
    },
    subtitle: {
      fontSize: FontSize.sm,
      lineHeight: LineHeight.sm,
      color: Colors.textMuted,
      marginTop: 2,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
  });
