import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Spacing } from '@/constants/colors';

export interface LoadingScreenProps {
  label?: string;
  showBrand?: boolean;
}

/**
 * Pantalla de carga limpia, usada durante la restauración de sesión
 * (splash) y como estado de carga a pantalla completa en otras vistas.
 */
export function LoadingScreen({ label, showBrand = false }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      {showBrand && (
        <>
          <Image source={require('@/assets/images/brand/logo-mark.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brandTitle}>MR. LANA</Text>
          <Text style={styles.brandSubtitle}>PEOPLE</Text>
        </>
      )}
      <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: Spacing.md,
  },
  brandTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 4,
    marginBottom: Spacing.xl,
  },
  spinner: {
    marginTop: Spacing.md,
  },
  label: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
