import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from './Button';
import { MascotAvatar } from './mascot/MascotAvatar';

import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useAppConfig, useLatestAppRelease } from '@/hooks/queries/useAppRelease';
import { useMaintenanceStore } from '@/store/maintenanceStore';
import {
  evaluateUpdate,
  getCurrentAppVersion,
  getCurrentBuildNumber,
  isBelowMinimumBuild,
  isBelowMinimumVersion,
  resolveMinimumBuildForPlatform,
  resolveMinimumVersionForPlatform,
} from '@/utils/appVersion';
import { logError } from '@/utils/errors';

export interface ForceUpdateScreenProps {
  enabled: boolean;
}

/**
 * Pantalla bloqueante de actualización obligatoria (AGENTS.md sección 41).
 * Solo bloquea cuando hay una `download_url` real que ofrecer — nunca deja
 * al usuario atrapado sin salida (sección 41: "sin URL válida"). Comparación
 * SIEMPRE por `build_number`/versión numérica, nunca por string simple
 * (sección 39).
 *
 * Prioridad frente a `MaintenanceScreen` (AGENTS.md sección 10): si el
 * backend está en mantenimiento, esa pantalla manda — no tiene sentido
 * bloquear pidiendo "actualiza ahora" cuando ni siquiera se puede validar
 * la actualización contra un servidor caído.
 */
export function ForceUpdateScreen({ enabled }: ForceUpdateScreenProps) {
  const { data: config } = useAppConfig();
  const { data: release } = useLatestAppRelease(enabled);
  const maintenanceActive = useMaintenanceStore((state) => state.active);
  const [opening, setOpening] = useState(false);

  const { mandatory } = evaluateUpdate(release, config?.force_update ?? false);
  const belowMinimumVersion = isBelowMinimumVersion(getCurrentAppVersion(), resolveMinimumVersionForPlatform(config));
  const belowMinimumBuild = isBelowMinimumBuild(getCurrentBuildNumber(), resolveMinimumBuildForPlatform(config));
  const shouldBlock = !maintenanceActive && (mandatory || belowMinimumVersion || belowMinimumBuild);
  const hasValidUpdateUrl = Boolean(release?.download_url);

  useEffect(() => {
    if (shouldBlock && !hasValidUpdateUrl && __DEV__) {
      // Nunca debe atrapar al usuario: si el backend pide actualización
      // obligatoria pero no hay release/URL válida, la app sigue
      // funcionando normal — esto solo se avisa en DEV para que se note el
      // hueco de datos del lado del backend.
      console.warn('[ForceUpdateScreen] Actualización obligatoria pedida por el backend pero sin release/download_url válida — no se bloquea.');
    }
  }, [shouldBlock, hasValidUpdateUrl]);

  useEffect(() => {
    if (!enabled || !shouldBlock || !hasValidUpdateUrl) return undefined;
    // Bloqueo real (sección 10: "No permitir Back para saltarla") — mientras
    // esta pantalla está activa, el botón físico/gesto de back de Android no
    // debe revelar ninguna pantalla detrás.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [enabled, shouldBlock, hasValidUpdateUrl]);

  if (!enabled || !shouldBlock || !hasValidUpdateUrl || !release) return null;

  const handleUpdate = async () => {
    setOpening(true);
    try {
      await Linking.openURL(release.download_url);
    } catch (error) {
      logError('ForceUpdateScreen.handleUpdate', error);
    } finally {
      setOpening(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <MascotAvatar orientation="right" size="lg" />
      <Text style={styles.title}>Necesitas actualizar MR. LANA PEOPLE</Text>
      <Text style={styles.message}>
        Hay una versión más nueva ({release.version}) con correcciones importantes. Actualiza para seguir usando la app.
      </Text>
      <Button title="Actualizar ahora" onPress={() => void handleUpdate()} loading={opening} disabled={opening} fullWidth={false} style={styles.button} />
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
    zIndex: 1300,
    elevation: 1300,
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
