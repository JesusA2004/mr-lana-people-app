import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from './Button';
import { MascotAvatar } from './mascot/MascotAvatar';

import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useMaintenanceStore } from '@/store/maintenanceStore';

/**
 * Pantalla completa para 503 (V4 sección 71) — reemplaza cualquier
 * contenido mientras el backend está en mantenimiento, en vez de dejar que
 * cada pantalla muestre su propio error técnico. Se retira sola en cuanto
 * cualquier request vuelve a tener éxito (ver `src/api/client.ts`); el
 * botón "Reintentar" solo fuerza a intentarlo de inmediato en vez de
 * esperar la próxima acción del usuario.
 */
export function MaintenanceScreen() {
  const active = useMaintenanceStore((state) => state.active);
  const message = useMaintenanceStore((state) => state.message);
  const setActive = useMaintenanceStore((state) => state.setActive);
  const [retrying, setRetrying] = useState(false);

  if (!active) return null;

  const handleRetry = () => {
    setRetrying(true);
    // No hay una única query "actual" que reintentar desde aquí (puede
    // haber fallado cualquier pantalla) — se limita a quitar el bloqueo;
    // el pull-to-refresh o la navegación de vuelta dispara el fetch real.
    setTimeout(() => {
      setActive(false);
      setRetrying(false);
    }, 400);
  };

  return (
    <SafeAreaView style={styles.container}>
      <MascotAvatar orientation="right" size="lg" />
      <Text style={styles.title}>Estamos realizando mantenimiento</Text>
      <Text style={styles.message}>{message ?? 'El servicio de MR. LANA PEOPLE está temporalmente fuera. Vuelve a intentarlo en unos minutos.'}</Text>
      <Button title="Reintentar" onPress={handleRetry} loading={retrying} disabled={retrying} fullWidth={false} style={styles.button} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
    zIndex: 1200,
    elevation: 1200,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
});
