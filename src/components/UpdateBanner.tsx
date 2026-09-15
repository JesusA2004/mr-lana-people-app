import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useAppConfig, useLatestAppRelease } from '@/hooks/queries/useAppRelease';
import { evaluateUpdate, resolveReleaseUrl } from '@/utils/appVersion';
import { logError } from '@/utils/errors';

export interface UpdateBannerProps {
  enabled: boolean;
}

/**
 * Banner no bloqueante de actualización opcional (AGENTS.md sección 40) —
 * la obligatoria la maneja `ForceUpdateScreen`, que toma prioridad total.
 * Se puede cerrar por esta sesión; vuelve a aparecer en el siguiente
 * arranque mientras siga habiendo una versión más nueva.
 */
export function UpdateBanner({ enabled }: UpdateBannerProps) {
  const insets = useSafeAreaInsets();
  const { data: config } = useAppConfig();
  const { data: release } = useLatestAppRelease(enabled);
  const [dismissed, setDismissed] = useState(false);

  if (!enabled || dismissed || !release) return null;

  const { updateAvailable, mandatory } = evaluateUpdate(release, config?.force_update ?? false);
  if (!updateAvailable || mandatory) return null;

  // En iOS el release no trae APK: la salida es `install_url`/`store_url`.
  // Sin ninguna URL no tiene sentido invitar a actualizar.
  const updateUrl = resolveReleaseUrl(release);
  if (!updateUrl) return null;

  const handleUpdate = async () => {
    try {
      await Linking.openURL(updateUrl);
    } catch (error) {
      logError('UpdateBanner.handleUpdate', error);
    }
  };

  return (
    <View style={[styles.banner, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
      <Ionicons name="arrow-up-circle" size={22} color={Colors.primaryDark} />
      <View style={styles.textColumn}>
        <Text style={styles.title}>Nueva versión disponible</Text>
        <Text style={styles.subtitle}>MR. LANA PEOPLE {release.version}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Actualizar ahora" onPress={() => void handleUpdate()} hitSlop={8}>
        <Text style={styles.action}>Actualizar</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar aviso de actualización" onPress={() => setDismissed(true)} hitSlop={8}>
        <Ionicons name="close" size={16} color={Colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    zIndex: 1000,
    elevation: 1000,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  action: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
});
