import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/colors';

/**
 * Lo que se ve mientras la app termina de arrancar si el splash nativo ya
 * se ocultó (watchdog, cambio rápido de cuenta): mismo fondo y logo que el
 * splash — nunca una pantalla en blanco.
 */
export function StartupFallback() {
  return (
    <View style={styles.container} accessibilityLabel="Cargando Mr. Lana People" accessible>
      <Image source={require('@/assets/images/brand/logo-mark.png')} style={styles.logo} contentFit="contain" />
      <ActivityIndicator color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
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
