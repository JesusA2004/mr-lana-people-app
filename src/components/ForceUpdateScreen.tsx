import * as Linking from 'expo-linking';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from './Button';
import { MascotAvatar } from './mascot/MascotAvatar';

import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useAppConfig, useLatestAppRelease } from '@/hooks/queries/useAppRelease';
import { evaluateUpdate, getCurrentAppVersion, isBelowMinimumVersion } from '@/utils/appVersion';
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
 */
export function ForceUpdateScreen({ enabled }: ForceUpdateScreenProps) {
  const { data: config } = useAppConfig();
  const { data: release } = useLatestAppRelease(enabled);
  const [opening, setOpening] = useState(false);

  if (!enabled || !release?.download_url) return null;

  const { mandatory } = evaluateUpdate(release, config?.force_update ?? false);
  const belowMinimum = isBelowMinimumVersion(getCurrentAppVersion(), config?.minimum_version);

  if (!mandatory && !belowMinimum) return null;

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
