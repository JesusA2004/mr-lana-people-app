import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BrandLogo } from '@/components/BrandLogo';
import { type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';

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
  const styles = useEstilos(crearEstilos);
  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(120)} style={styles.container} pointerEvents="auto">
      <BrandLogo width={240} />
    </Animated.View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
});
