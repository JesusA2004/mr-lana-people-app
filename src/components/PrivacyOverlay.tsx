import { Image } from 'expo-image';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Colors, FontSize, Spacing } from '@/constants/colors';

export interface PrivacyOverlayProps {
  visible: boolean;
}

/**
 * Pantalla sólida sin datos del colaborador (AGENTS.md V3 sección 45): se
 * monta de inmediato cuando la app deja de estar en foreground (ver
 * `useBackgroundPrivacy`). En Android, `FLAG_SECURE` (activado por
 * `useAppPrivacyProtection`) ya oculta el preview del app switcher por su
 * cuenta; esta capa cubre además el instante de transición y iOS antes de
 * que el blur nativo de `enableAppSwitcherProtectionAsync` tome efecto.
 */
export function PrivacyOverlay({ visible }: PrivacyOverlayProps) {
  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(120)} style={styles.container} pointerEvents="auto">
      <Image source={require('@/assets/images/brand/logo-mark.png')} style={styles.logo} contentFit="contain" />
      <Text style={styles.brandTitle}>MR. LANA</Text>
      <Text style={styles.brandSubtitle}>PEOPLE</Text>
    </Animated.View>
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
    gap: 2,
    zIndex: 999,
    elevation: 999,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: Spacing.md,
  },
  brandTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 6,
  },
});
