import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';

/**
 * Lo que se ve mientras la app termina de arrancar si el splash nativo ya
 * se ocultó (watchdog, cambio rápido de cuenta): mismo fondo y logo que el
 * splash — nunca una pantalla en blanco.
 */
export function StartupFallback() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.container} accessibilityLabel="Cargando Mr. Lana People" accessible>
      <Image source={require('@/assets/images/brand/logo-mark.png')} style={styles.logo} contentFit="contain" />
      <ActivityIndicator color={Colors.primary} />
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    backgroundColor: Colors.background,
  },
  logo: {
    width: 96,
    height: 96,
  },
});
